// Quick test to verify the Gemini API key works directly
// Run: node test-key.js YOUR_API_KEY_HERE

const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Usage: node test-key.js YOUR_API_KEY_HERE");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        contents: [{ parts: [{ text: "Say: hello" }] }]
    })
})
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            console.error("❌ API Key Error:", data.error.code, data.error.message);
        } else {
            console.log("✅ API Key works! Response:", data.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    })
    .catch(err => console.error("❌ Fetch error:", err.message));
