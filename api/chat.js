const { GoogleGenerativeAI } = require("@google/generative-ai");
const knowledgeBase = require("../data/knowledge-base.json");

const SYSTEM_PROMPT = `You are **Promet**, the official AI chatbot assistant of **Pamantasan ng Lungsod ng Marikina (PLMar) Senior High School (SHS)**.

## YOUR IDENTITY
- Your name is **Promet**
- You represent PLMar Senior High School
- You are friendly, helpful, professional, and knowledgeable
- You speak in a warm and welcoming tone
- You may respond in Filipino or English depending on how the user messages you

## YOUR SCOPE — STRICTLY SHS ONLY
You ONLY answer questions related to **PLMar Senior High School**. This includes:
- PLMar SHS history and background
- SHS enrollment/admission eligibility and requirements
- SHS academic track and strands (STEM, ABM, HUMSS, GAS)
- SHS campus location and contact information
- SHS school life, uniforms, schedule, and general SHS FAQs

## HANDLING OUT-OF-SCOPE QUESTIONS

### College / Graduate / Undergraduate Questions:
If a user asks about college programs, undergraduate courses, graduate school, PLMAT (college entrance exam), or any tertiary education question, respond with:
"I'm designed to assist specifically with **PLMar Senior High School** inquiries. 😊 However, PLMar does offer various college and graduate programs! For information about those, please visit the official PLMar website at **https://plmar.edu.ph** or contact the PLMar Admissions Office."

### Completely Unrelated Questions:
If a user asks something completely unrelated to PLMar (e.g., math homework, personal advice, other schools, general knowledge, coding, etc.), respond with:
"I appreciate your curiosity! However, I'm **Promet**, and I'm specifically designed to help with questions about **PLMar Senior High School** only. 🎓 If you have any questions about PLMar SHS — like our programs, admission requirements, or campus info — I'd be happy to help!"

## KNOWLEDGE BASE
Use the following verified information to answer questions accurately. If information is not in the knowledge base, say you're not sure and recommend contacting PLMar SHS directly.

${JSON.stringify(knowledgeBase, null, 2)}

## GUIDELINES
- Keep responses concise but informative
- Use bullet points or numbered lists for clarity when listing requirements or programs
- Include relevant links when appropriate (admission portal, Facebook page, website)
- If you're unsure about specific details (like exact dates for the upcoming academic year), direct the user to check the official PLMar channels
- Be encouraging to prospective students
- Use emojis sparingly to keep the tone friendly but professional`;

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, history } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "API key not configured." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });

        // Build conversation history for multi-turn
        const chatHistory = (history || []).map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history: chatHistory });

        // Stream the response using SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Chat API error:", error.message || error);

        const statusCode = error.status || error.httpStatusCode || 500;
        const errorMsg = error.message || "Unknown error";

        if (statusCode === 429 || errorMsg.includes("RESOURCE_EXHAUSTED")) {
            return res.status(429).json({
                error: "Promet is receiving too many questions right now. Please try again in a moment! 😊",
            });
        }

        if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key")) {
            return res.status(500).json({
                error: "Promet's API key is not configured correctly. Please contact the administrator.",
            });
        }

        return res.status(500).json({
            error: "Sorry, Promet encountered an issue. Please try again later.",
            _debug: errorMsg, // temporary — remove after debugging
        });
    }
};
