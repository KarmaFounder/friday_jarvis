# Monday.com AI Agent Backend

A Node.js backend server that provides an AI-powered interface for interacting with Monday.com boards and tasks using natural language.

## Features

- **Natural Language Processing**: Uses Google Gemini AI to understand user intents
- **Monday.com Integration**: Performs actions on Monday.com boards via GraphQL API
- **Supported Actions**:
  - Create tasks on boards
  - Update task statuses
  - List all boards
  - More features coming soon!

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file with your API keys:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   MONDAY_API_KEY=your_monday_api_key_here
   PORT=3001
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

## API Endpoints

### `POST /api/chat`

Send natural language requests to interact with Monday.com.

**Request Body**:
```json
{
  "message": "Create a new task called 'Design homepage' on the marketing board"
}
```

**Response**:
```json
{
  "message": "Great! I've created the task 'Design homepage' on the 'marketing' board.",
  "intent": "CREATE_TASK",
  "entities": {
    "boardName": "marketing",
    "taskName": "Design homepage"
  },
  "success": true,
  "data": { ... }
}
```

## Example Requests

- **Create Task**: "Create a new task called 'Review budget' on the finance board"
- **Update Status**: "Update the status of 'Review budget' on the finance board to 'Done'"
- **List Boards**: "Show me all my boards"

## Architecture

- `server.js` - Main Express server and API endpoints
- `geminiService.js` - Google Gemini AI integration for intent recognition
- `mondayService.js` - Monday.com API integration using GraphQL

## Development

The server runs on port 3001 by default and provides detailed logging for debugging.
