#!/usr/bin/env python3
"""
Development server for Friday with hot reload
"""

import os
import sys
import subprocess
import threading
import time
from pathlib import Path

def start_flask_server():
    """Start the Flask backend server"""
    print("🔧 Starting Flask backend server...")
    os.system("python start_web.py")

def start_react_dev_server():
    """Start the React development server with hot reload"""
    react_dir = Path(__file__).parent / "monday_backend" / "react_app"
    print("⚡ Starting React development server with hot reload...")
    
    # Change to react directory and start dev server
    os.chdir(react_dir)
    os.system("npm start")

def main():
    print("🚀 Starting Friday Development Environment")
    print("━" * 50)
    print("🔧 Backend: http://localhost:5000")
    print("⚡ React Dev: http://localhost:3000")
    print("━" * 50)
    print("💡 Use http://localhost:3000 for development with hot reload!")
    print("🔄 Changes to React files will automatically reload")
    print("🛑 Press Ctrl+C to stop both servers")
    print("━" * 50)
    
    # Start Flask server in a separate thread
    flask_thread = threading.Thread(target=start_flask_server, daemon=True)
    flask_thread.start()
    
    # Give Flask time to start
    time.sleep(2)
    
    # Start React dev server (this will be the main process)
    try:
        start_react_dev_server()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down development servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()
