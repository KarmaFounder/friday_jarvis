# 🚀 Friday AI Assistant - Setup Instructions

## ✅ What's Already Done

1. ✅ **Virtual Environment Created** - `venv` folder is ready
2. ✅ **Dependencies Installed** - All required packages are installed
3. ✅ **Code Issues Fixed** - Agent initialization is now properly configured
4. ✅ **Environment Template Created** - `.env.example` file is ready

## 🔧 What You Need to Do

### 1. Create Your Environment File
Copy the `.env.example` file to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `.env` and add your actual API keys:

- **LiveKit**: Get from [LiveKit Cloud Console](https://cloud.livekit.io/)
  - `LIVEKIT_URL` - Your LiveKit server URL
  - `LIVEKIT_API_KEY` - Your API key
  - `LIVEKIT_API_SECRET` - Your API secret

- **Google AI**: Get from [Google AI Studio](https://aistudio.google.com/)
  - `GOOGLE_API_KEY` - Your Google AI API key

- **Gmail (Optional)**: For email functionality
  - `GMAIL_USER` - Your Gmail address
  - `GMAIL_APP_PASSWORD` - Your Gmail app password (not regular password)

### 2. Activate Virtual Environment
```bash
source venv/bin/activate
```

### 3. Run the Assistant
```bash
python agent.py
```

## 🎯 Features Available

- 🔍 **Web Search** - Uses DuckDuckGo to search the internet
- 🌤️ **Weather** - Get current weather for any city
- 📨 **Email** - Send emails through Gmail (if configured)
- 🗣️ **Voice Interaction** - Real-time voice chat through LiveKit
- 📷 **Vision** - Camera support for visual interactions

## 🎭 Personality

Friday speaks like a classy butler from Iron Man - sarcastic, witty, and efficient!

## 🛠️ Troubleshooting

1. **Authentication Errors**: Make sure your API keys are correct in `.env`
2. **LiveKit Issues**: Verify your LiveKit account is set up correctly
3. **Gmail Issues**: Use an App Password, not your regular Gmail password

## 📺 Tutorial

Watch the setup tutorial: [YouTube Link](https://youtu.be/An4NwL8QSQ4?si=v1dNDDonmpCG1Els)

---

Your Friday AI Assistant is ready to serve! 🤖✨
