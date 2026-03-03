// ===================================
// PROMET — PLMar SHS Chatbot
// Client-Side Chat Logic
// ===================================

const WELCOME_CONTENT =
    'Kumusta! 👋 I\'m <strong>Promet</strong>, your friendly PLMar Senior High School assistant. I can help you with questions about:<br><br>' +
    '• 📚 <strong>SHS Programs & Strands</strong> (STEM, ABM, HUMSS, GAS)<br>' +
    '• 📝 <strong>Admission Requirements & Eligibility</strong><br>' +
    '• 🏫 <strong>School History & Campus Info</strong><br>' +
    '• 📞 <strong>Contact Information</strong><br><br>' +
    'How can I help you today?';

// State
let conversationHistory = [];
let isLoading = false;

// DOM elements
const messagesWrapper = document.getElementById('messages-wrapper');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const quickQuestions = document.getElementById('quick-questions');
const messagesArea = document.getElementById('messages-area');

// ===================================
// Initialization
// ===================================

function init() {
    addBotMessage(WELCOME_CONTENT, false);
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keydown', handleKeyDown);
    updateSendButton();
}

// ===================================
// Message Rendering
// ===================================

function createMessageElement(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role === 'user' ? 'user' : 'assistant'}`;

    let html = '';

    if (role === 'assistant') {
        html += '<div class="message-avatar"><div class="avatar-icon">P</div></div>';
    }

    html += `<div class="message-bubble"><div class="message-content">${content}</div></div>`;

    messageDiv.innerHTML = html;
    return messageDiv;
}

function addBotMessage(htmlContent, addToHistory = true) {
    const el = createMessageElement('assistant', htmlContent);
    messagesWrapper.appendChild(el);
    scrollToBottom();

    if (addToHistory) {
        conversationHistory.push({ role: 'assistant', content: htmlContent });
    }
}

function addUserMessage(text) {
    const escaped = escapeHtml(text);
    const el = createMessageElement('user', escaped);
    messagesWrapper.appendChild(el);
    scrollToBottom();

    conversationHistory.push({ role: 'user', content: text });
}

function addTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message message-assistant';
    el.id = 'typing-indicator';
    el.innerHTML =
        '<div class="message-avatar"><div class="avatar-icon">P</div></div>' +
        '<div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    messagesWrapper.appendChild(el);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// ===================================
// Chat Logic
// ===================================

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isLoading) return;

    handleSend(text);
}

function sendQuickQuestion(question) {
    if (isLoading) return;
    handleSend(question);
}

async function handleSend(text) {
    isLoading = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendButton();
    chatInput.disabled = true;

    // Hide quick questions after first interaction
    if (quickQuestions) {
        quickQuestions.classList.add('hidden');
    }

    // Add user message
    addUserMessage(text);

    // Show typing indicator
    addTypingIndicator();

    // Build history for API (skip very first welcome message from UI)
    const apiHistory = conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
    }));

    // Keep only last 20 messages for context
    const trimmedHistory = apiHistory.slice(-20);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: trimmedHistory,
            }),
        });

        removeTypingIndicator();

        if (!response.ok) {
            let errorMsg = 'Sorry, something went wrong. Please try again.';
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch (e) { }
            addBotMessage(escapeHtml(errorMsg));
            return;
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        // Create bot message element for streaming
        const botEl = createMessageElement('assistant', '');
        messagesWrapper.appendChild(botEl);
        const contentEl = botEl.querySelector('.message-content');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            assistantContent += parsed.text;
                            contentEl.innerHTML = formatMarkdown(assistantContent);
                            scrollToBottom();
                        }
                    } catch (e) {
                        // skip
                    }
                }
            }
        }

        // Save to history
        conversationHistory.push({ role: 'assistant', content: assistantContent });

    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator();
        addBotMessage(
            "I'm sorry, I encountered an issue processing your request. Please try again in a moment. " +
            'If the problem persists, you can contact PLMar SHS directly at <strong>(02) 7369-7277</strong>. 😊'
        );
    } finally {
        isLoading = false;
        chatInput.disabled = false;
        chatInput.focus();
        updateSendButton();
    }
}

// ===================================
// Text Formatting
// ===================================

function formatMarkdown(text) {
    return text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        // Markdown links
        .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Bare URLs (not already in href)
        .replace(/(^|[^"(])(https?:\/\/[^\s<)]+)/g,
            '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// UI Helpers
// ===================================

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function handleInputChange() {
    // Auto-resize textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    updateSendButton();
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function updateSendButton() {
    const hasText = chatInput.value.trim().length > 0;
    if (hasText && !isLoading) {
        sendButton.classList.add('active');
        sendButton.disabled = false;
    } else {
        sendButton.classList.remove('active');
        sendButton.disabled = !hasText || isLoading;
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
