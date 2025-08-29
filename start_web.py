#!/usr/bin/env python3
"""
Friday AI Assistant - Web Interface Launcher
"""

import os
import sys
from pathlib import Path

# Add the monday_backend directory to the Python path
monday_backend_dir = Path(__file__).parent / "monday_backend"
sys.path.insert(0, str(monday_backend_dir))

# Import and run the web server
from web_server import app

if __name__ == "__main__":
    print("🤖 Starting Friday Web Interface...")
    print("📱 Open your browser and go to: http://localhost:5000")
    print("🎙️ Features available:")
    print("   • Text chat with Friday")
    print("   • Voice input (hold microphone button)")
    print("   • Monday.com task creation")
    print("   • Weather, web search, and email tools")
    print("   • Sound wave visualization")
    print("\n🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        app.run(debug=False, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n👋 Friday web interface stopped. Goodbye!")
        sys.exit(0)
