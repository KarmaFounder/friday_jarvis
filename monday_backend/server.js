const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables FIRST
dotenv.config();

// Import services AFTER dotenv is loaded
const { getIntentAndEntities } = require('./geminiService');
const { createMondayTask, createMondayTaskWithSubtasks, createAutonomousProject, updateMondayTaskStatus, listMondayBoards, getGroupStatusReport, getGroupWorkloadReport } = require('./mondayService');

// Global progress tracker
let progressClients = new Map();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Monday.com AI Agent Backend is running!' });
});

// Server-Sent Events endpoint for progress streaming
app.get('/api/progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store client connection
  progressClients.set(sessionId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Progress stream connected' })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    progressClients.delete(sessionId);
  });
});

// Helper function to send progress updates
function sendProgress(sessionId, message, type = 'progress') {
  const client = progressClients.get(sessionId);
  if (client) {
    client.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`);
  }
}

// Export sendProgress for use in mondayService
global.sendProgress = sendProgress;

// Chat endpoint - Integrated with Gemini AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📨 Received user message:', message);

    // Get intent and entities from Gemini AI
    const intentData = await getIntentAndEntities(message);
    
    console.log('🎯 Intent and entities extracted:', intentData);

    let result;
    let responseMessage;

    // Execute action based on intent
    switch (intentData.intent) {
      case 'CREATE_TASK':
        console.log('🔨 Executing CREATE_TASK action...');
        result = await createMondayTask(intentData.entities);
        if (result.success) {
          let response = `✅ Successfully created task "${result.task.name}" (ID: ${result.task.id})`;
          
          if (result.assignedUser) {
            response += `\n👤 Assigned to: ${result.assignedUser}`;
          }
          
          if (result.generatedUpdate) {
            response += `\n📝 Generated update: "${result.generatedUpdate}"`;
          }
          
          if (result.subtasks && result.subtasks.length > 0) {
            response += `\n🔗 Created ${result.subtasks.length} subtasks:`;
            result.subtasks.forEach((subtask, index) => {
              response += `\n  ${index + 1}. ${subtask.name} (ID: ${subtask.id})`;
            });
          }
          
          responseMessage = response;
        } else {
          responseMessage = `Sorry, I couldn't create the task. ${result.error}`;
        }
        break;

      case 'CREATE_TASK_WITH_SUBTASKS':
        console.log('🔨 Executing CREATE_TASK_WITH_SUBTASKS action...');
        try {
          result = await createMondayTaskWithSubtasks(intentData.entities);
          let response = `✅ Successfully created task "${result.mainTask.name}" with ID ${result.mainTask.id}`;
          
          if (result.update) {
            response += `\n📝 Added update: "${result.update}"`;
          }
          
          if (result.deadline) {
            response += `\n📅 Set deadline: ${result.deadline}`;
          }
          
          if (result.subtasks && result.subtasks.length > 0) {
            response += `\n🔗 Created ${result.subtasks.length} subtasks:`;
            result.subtasks.forEach((subtask, index) => {
              response += `\n  ${index + 1}. ${subtask.name} (ID: ${subtask.id})`;
            });
          }
          
          responseMessage = response;
        } catch (error) {
          responseMessage = `Sorry, I couldn't create the task with subtasks. ${error.message}`;
        }
        break;

      case 'UPDATE_STATUS':
        console.log('🔄 Executing UPDATE_STATUS action...');
        result = await updateMondayTaskStatus(intentData.entities);
        if (result.success) {
          responseMessage = `Perfect! I've updated the status of "${intentData.entities.taskName}" on the "${intentData.entities.boardName}" board to "${intentData.entities.newStatus}".`;
        } else {
          responseMessage = `Sorry, I couldn't update the task status. ${result.error}`;
        }
        break;

      case 'CREATE_AUTONOMOUS_PROJECT':
        console.log('🤖 Executing CREATE_AUTONOMOUS_PROJECT action...');
        if (sessionId) {
          sendProgress(sessionId, 'Starting autonomous project creation...', 'info');
        }
        try {
          result = await createAutonomousProject(intentData.entities, sessionId);
          if (result.success) {
            let response = `🚀 Successfully created autonomous project "${result.mainTask.name}" (ID: ${result.mainTask.id})`;
            
            if (result.subtasks && result.subtasks.length > 0) {
              response += `\n\n📋 Generated ${result.subtasks.length} subtasks:`;
              result.subtasks.forEach((subtask, index) => {
                response += `\n  ${index + 1}. ${subtask.name}`;
                if (subtask.assigneeName) {
                  response += ` → Assigned to: ${subtask.assigneeName}`;
                }
                if (subtask.deadline) {
                  response += ` | Due: ${subtask.deadline}`;
                }
                if (subtask.brief) {
                  response += `\n     Brief: ${subtask.brief}`;
                }
              });
            }
            
            responseMessage = response;
          } else {
            responseMessage = `Sorry, I couldn't create the autonomous project. ${result.error}`;
          }
        } catch (error) {
          responseMessage = `Sorry, I encountered an error creating the autonomous project. ${error.message}`;
        }
        break;

      case 'GET_STATUS_REPORT':
        console.log('📊 Executing GET_STATUS_REPORT action...');
        try {
          result = await getGroupStatusReport(intentData.entities);
          if (result.success) {
            responseMessage = result.report;
          } else {
            responseMessage = `Sorry, I couldn't generate the status report. ${result.error}`;
          }
        } catch (error) {
          responseMessage = `Sorry, I encountered an error generating the status report. ${error.message}`;
        }
        break;

      case 'GET_WORKLOAD_REPORT':
        console.log('👥 Executing GET_WORKLOAD_REPORT action...');
        try {
          result = await getGroupWorkloadReport(intentData.entities);
          if (result.success) {
            responseMessage = result.report;
          } else {
            responseMessage = `Sorry, I couldn't generate the workload report. ${result.error}`;
          }
        } catch (error) {
          responseMessage = `Sorry, I encountered an error generating the workload report. ${error.message}`;
        }
        break;

      case 'LIST_BOARDS':
        console.log('📋 Executing LIST_BOARDS action...');
        result = await listMondayBoards();
        if (result.success) {
          const boardList = result.boards.map(board => `• ${board.name} (${board.items_count} items)`).join('\n');
          responseMessage = `Here are your Monday.com boards:\n\n${boardList}`;
        } else {
          responseMessage = `Sorry, I couldn't retrieve your boards. ${result.error}`;
        }
        break;

      case 'UNKNOWN':
      default:
        console.log('❓ Unknown intent - providing help message');
        responseMessage = "I'm not sure what you'd like me to do. I can help you with:\n• 🚀 Creating autonomous projects with AI-generated subtasks\n• 📝 Creating simple tasks with updates, deadlines, and subtasks\n• 📊 Generating status reports for groups\n• 👥 Creating workload reports and identifying bottlenecks\n• 🔄 Updating task statuses\n• 📋 Listing your Monday.com boards\n\nTry asking me to launch a project, get a status report, or show workload distribution!";
        result = { success: false, error: 'Unknown intent' };
        break;
    }

    // Send completion notification if sessionId provided
    if (sessionId) {
      sendProgress(sessionId, 'Task completed!', 'complete');
    }

    // Send final response
    res.json({
      message: responseMessage,
      intent: intentData.intent,
      entities: intentData.entities,
      success: result?.success || false,
      data: result
    });

  } catch (error) {
    console.error('❌ Error in /api/chat:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
});
