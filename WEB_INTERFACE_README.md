# 🌐 Friday Web Interface

A beautiful, modern web interface for Friday AI Assistant with Monday.com integration, voice interaction, and ChatGPT-style sound wave visualization.

## ✨ Features

### 🎨 Modern UI Design
- **White background with black elements** - Clean, professional look
- **Friday branding** - Logo and app name prominently displayed
- **Sound wave visualization** - Real-time visual feedback during voice interactions
- **Responsive design** - Works on desktop and mobile devices
- **ChatGPT-inspired interface** - Familiar and intuitive user experience

### 🗣️ Voice Interaction
- **Voice input** - Hold the microphone button to speak
- **Text-to-speech** - Friday speaks responses with a British accent
- **Visual feedback** - Sound waves animate during speaking and listening
- **Status indicators** - Shows when Friday is listening, thinking, or speaking

### 📋 Monday.com Integration
- **Task creation** - Create tasks directly from chat or dedicated panel
- **Board management** - List and select from your Monday.com boards
- **Quick actions** - Fast task creation with minimal clicks
- **Real-time updates** - Instant feedback when tasks are created

### 🛠️ Built-in Tools
- **Weather information** - Get current weather for any city
- **Web search** - Search the internet using DuckDuckGo
- **Email sending** - Send emails through Gmail integration
- **Monday.com tasks** - Create and manage tasks
- **Quick actions** - Pre-defined shortcuts for common requests

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install flask flask-cors
```

### 2. Configure API Keys
Make sure your `.env` file includes:
```bash
# Google AI API
GOOGLE_API_KEY=your_google_api_key

# Monday.com API (get from Monday.com developer section)
MONDAY_API_KEY=your_monday_api_key

# LiveKit (for voice features)
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret

# Gmail (optional, for email features)
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### 3. Start the Web Interface
```bash
python start_web.py
```

### 4. Open Your Browser
Visit: http://localhost:5000

## 📱 How to Use

### Text Chat
1. Type your message in the input field
2. Press Enter or click the send button
3. Friday will respond with text and voice

### Voice Input
1. Hold down the microphone button
2. Speak your message clearly
3. Release the button when done
4. Friday will process and respond

### Monday.com Tasks
1. Click the calendar icon to open the Monday.com panel
2. Enter a task name
3. Select a board
4. Click "Create Task"

### Quick Actions
Use the quick action buttons for common requests:
- **Help** - Learn what Friday can do
- **Show Boards** - List your Monday.com boards
- **Weather** - Get weather information
- **Search Web** - Search the internet

## 🎯 Voice Commands

Friday understands natural language. Try these examples:

### Weather
- "What's the weather in New York?"
- "How's the weather today in London?"
- "Give me the temperature for Tokyo"

### Web Search
- "Search for the latest AI news"
- "Look up information about Python programming"
- "Find recent articles about machine learning"

### Monday.com Tasks
- "Create a task called 'Review project proposal'"
- "Add a new task to my board"
- "List my Monday.com boards"

### Email
- "Send an email to john@example.com about the meeting"
- "Email the team about tomorrow's deadline"

## 🎨 UI Components

### Sound Wave Visualization
- **Listening** - Red waves when Friday is listening to you
- **Speaking** - Blue waves when Friday is responding
- **Animated bars** - Real-time visual feedback

### Status Indicators
- **Green dot** - Friday is ready
- **Blue dot** - Friday is listening
- **Yellow dot** - Friday is thinking
- **Red dot** - Error state

### Chat Interface
- **User messages** - Black bubbles on the right
- **Friday responses** - Light gray bubbles on the left
- **Timestamps** - Show when messages were sent
- **Avatars** - "Y" for you, "F" for Friday

## 🔧 Technical Details

### Architecture
- **Flask backend** - Handles API requests and Friday integration
- **HTML/CSS/JavaScript frontend** - Modern web interface
- **Web Speech API** - Browser-based voice recognition
- **SpeechSynthesis API** - Text-to-speech in the browser
- **Monday.com GraphQL API** - Task management integration

### File Structure
```
monday_backend/
├── templates/
│   └── index.html          # Main web interface
├── static/
│   ├── css/
│   │   └── style.css       # Modern styling
│   └── js/
│       └── app.js          # Interactive features
├── web_server.py           # Flask application
├── monday_integration.py   # Monday.com API client
└── monday_tools.py         # Monday.com function tools
```

### API Endpoints
- `GET /` - Main web interface
- `POST /api/chat` - Send messages to Friday
- `GET /api/tools/monday/boards` - List Monday.com boards
- `POST /api/tools/monday/create-task` - Create new tasks
- `GET /health` - Health check endpoint

## 🛠️ Customization

### Styling
Edit `monday_backend/static/css/style.css` to customize:
- Colors and themes
- Animation speeds
- Layout and spacing
- Typography

### Voice Settings
Modify `monday_backend/static/js/app.js` to adjust:
- Speech recognition language
- Text-to-speech voice and speed
- Sound wave animation

### Friday's Personality
Update `prompts.py` to customize Friday's responses and behavior.

## 🐛 Troubleshooting

### Common Issues

**"API key not valid" error**
- Check your Google API key in `.env`
- Ensure the key has proper permissions

**Voice recognition not working**
- Use Chrome or Edge browser
- Allow microphone permissions
- Ensure you're on HTTPS (or localhost)

**Monday.com integration failing**
- Verify your Monday API key
- Check board IDs are correct
- Ensure proper API permissions

**Web interface not loading**
- Check Flask is running on port 5000
- Verify all dependencies are installed
- Look for error messages in the console

### Getting Help
- Check the browser console for JavaScript errors
- Review Flask server logs for backend issues
- Ensure all environment variables are set correctly

## 🎉 Success!

You now have a fully functional web interface for Friday with:
- ✅ Modern ChatGPT-style UI
- ✅ Voice interaction with sound waves
- ✅ Monday.com task management
- ✅ All of Friday's original tools
- ✅ Responsive design for any device

Enjoy chatting with Friday through your beautiful new web interface! 🤖✨
