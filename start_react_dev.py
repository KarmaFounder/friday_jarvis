#!/usr/bin/env python3
"""
Simple React development server starter
"""

import os
import sys
from pathlib import Path

def main():
    react_dir = Path(__file__).parent / "monday_backend" / "react_app"
    
    print("🚀 Starting Friday React Development Server")
    print("━" * 50)
    print("⚡ React Dev Server: http://localhost:3000")
    print("🔄 Hot reload enabled - changes will auto-refresh")
    print("🎨 Edit files in /monday_backend/react_app/src/")
    print("🛑 Press Ctrl+C to stop")
    print("━" * 50)
    print("📝 Make sure Flask backend is running:")
    print("   python start_web.py (in another terminal)")
    print("━" * 50)
    
    if not react_dir.exists():
        print("❌ React app directory not found!")
        return False
    
    if not (react_dir / "node_modules").exists():
        print("📦 Installing dependencies first...")
        os.chdir(react_dir)
        os.system("npm install")
    
    print("🔥 Starting React dev server...")
    os.chdir(react_dir)
    os.system("npm start")

if __name__ == "__main__":
    main()
