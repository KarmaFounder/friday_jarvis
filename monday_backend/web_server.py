from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import asyncio
import json
import os
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from the main project
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from dotenv import load_dotenv
from livekit.agents import RunContext
import logging

# Import Friday's components
from tools import get_weather, search_web, send_email, create_crm_task
from monday_backend.monday_tools import create_monday_task, list_monday_boards, search_monday_tasks, add_task_update, create_crm_task as monday_create_crm_task
from prompts import AGENT_INSTRUCTION

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebFriday:
    """Web version of Friday that can process text messages and return responses"""
    
    def __init__(self):
        self.tools = {
            'get_weather': get_weather,
            'search_web': search_web,
            'send_email': send_email,
            'create_monday_task': create_monday_task,
            'list_monday_boards': list_monday_boards,
            'search_monday_tasks': search_monday_tasks,
            'add_task_update': add_task_update
        }
        self.context = None  # We'll need to mock this for web interface
    
    async def process_message(self, message: str) -> str:
        """Process a user message and return Friday's response"""
        
        # Simple keyword-based tool detection for web interface
        message_lower = message.lower()
        
        try:
            # Weather requests
            if any(word in message_lower for word in ['weather', 'temperature', 'forecast']):
                # Extract city name (simple extraction)
                words = message.split()
                city = None
                for i, word in enumerate(words):
                    if word.lower() in ['in', 'for', 'at']:
                        if i + 1 < len(words):
                            city = words[i + 1].strip('.,?!')
                            break
                
                if city:
                    return await self.tools['get_weather'](self.context, city)
                else:
                    return "Of course, Sir. Which city would you like the weather for?"
            
            # Web search requests
            elif any(word in message_lower for word in ['search', 'look up', 'find', 'google']):
                # Extract search query
                query = message
                for prefix in ['search for', 'look up', 'find', 'google']:
                    if prefix in message_lower:
                        query = message[message_lower.find(prefix) + len(prefix):].strip()
                        break
                
                return await self.tools['search_web'](self.context, query)
            
            # Monday.com CRM task creation
            elif any(word in message_lower for word in ['create task', 'add task', 'new task', 'crm task', 'paid media']):
                if 'create' in message_lower or 'add' in message_lower or 'new' in message_lower:
                    # Extract task name from message
                    task_name = None
                    if 'called' in message_lower:
                        start_idx = message_lower.find('called') + 6
                        task_name = message[start_idx:].strip(' "\'')
                    elif 'named' in message_lower:
                        start_idx = message_lower.find('named') + 5
                        task_name = message[start_idx:].strip(' "\'')
                    
                    if task_name:
                        return await create_crm_task(self.context, task_name)
                    else:
                        return "I'd be happy to create a CRM task for you, Sir. What should I call it?"
                
            # Monday.com board listing
            elif any(word in message_lower for word in ['boards', 'list boards', 'show boards']):
                return await self.tools['list_monday_boards'](self.context)
            
            # Email requests
            elif any(word in message_lower for word in ['email', 'send email', 'mail']):
                return "Certainly, Sir. I can send emails, but I'll need the recipient, subject, and message content."
            
            # General conversation
            else:
                return self._generate_friday_response(message)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return f"Apologies, Sir, but I encountered an error: {str(e)}"
    
    def _generate_friday_response(self, message: str) -> str:
        """Generate a Friday-style response for general conversation"""
        message_lower = message.lower()
        
        # Greetings
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return "Good day, Sir. I am Friday, your personal assistant. How may I be of service today?"
        
        # Help requests
        elif any(word in message_lower for word in ['help', 'what can you do', 'capabilities']):
            return """At your service, Sir. I can assist you with:
• Weather information for any city
• Web searches and research
• Creating tasks in Monday.com
• Sending emails
• General assistance with a touch of wit, naturally."""
        
        # Thanks
        elif any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
            return "You're quite welcome, Sir. It's what I'm here for."
        
        # Default response
        else:
            return "I'm at your disposal, Sir. Perhaps you could be more specific about how I might assist you today?"

# Initialize Friday
friday = WebFriday()

@app.route('/')
def index():
    """Serve the React voice interface"""
    return send_from_directory('react_app/build', 'index.html')

@app.route('/classic')
def classic_interface():
    """Serve the classic voice-only interface"""
    return render_template('voice_interface.html')

@app.route('/chat')
def chat_interface():
    """Serve the full chat interface"""
    return render_template('index.html')

@app.route('/<path:path>')
def static_react_files(path):
    """Serve React static files"""
    return send_from_directory('react_app/build', path)

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory('static', filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages from the web interface"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Process the message asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(friday.process_message(message))
        finally:
            loop.close()
        
        return jsonify({
            'response': response,
            'timestamp': int(os.times().system * 1000)  # Current timestamp
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tools/monday/boards', methods=['GET'])
def get_monday_boards():
    """Get Monday.com boards"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(list_monday_boards(None))
        finally:
            loop.close()
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"Error getting Monday boards: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tools/monday/create-task', methods=['POST'])
def create_task():
    """Create a Monday.com task"""
    try:
        data = request.get_json()
        task_name = data.get('task_name')
        board_id = data.get('board_id')
        group_id = data.get('group_id')
        
        if not task_name or not board_id:
            return jsonify({'error': 'Task name and board ID are required'}), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(
                create_monday_task(None, task_name, board_id, group_id)
            )
        finally:
            loop.close()
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"Error creating Monday task: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'Friday Web Interface'})

if __name__ == '__main__':
    print("🤖 Starting Friday Web Interface...")
    print("🌐 Visit http://localhost:5000 to chat with Friday")
    
    # Create templates and static directories if they don't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
