# Promet — PLMar SHS Chatbot 🎓

**Promet** is an AI-powered chatbot for **Pamantasan ng Lungsod ng Marikina (PLMar) Senior High School**. It answers questions about SHS programs, admission requirements, school history, and more.

## Tech Stack

- **Frontend**: HTML + CSS + JavaScript (no frameworks)
- **Backend**: Vercel Serverless Functions
- **AI**: Google Gemini API (`gemini-2.0-flash`, free tier)
- **Hosting**: Vercel (free)

## Setup & Deploy

### 1. Get a Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Create an API key — no credit card required

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import the repository
3. Add environment variable: `GEMINI_API_KEY` = your API key
4. Deploy!

### 3. Local Development (Optional)

```bash
npm install
npm i -g vercel
vercel dev
```

## Features

- 💬 Real-time streaming AI responses
- 🎓 PLMar SHS-focused knowledge base
- 🚫 Politely redirects non-SHS and unrelated questions
- 📱 Responsive design (mobile & desktop)
- ⚡ Powered by Gemini 2.0 Flash
