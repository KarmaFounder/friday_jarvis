#!/usr/bin/env python3
"""
Build script for Friday React interface
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(command, cwd=None):
    """Run a shell command and return success status"""
    try:
        print(f"Running: {command}")
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, 
                              capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

def main():
    script_dir = Path(__file__).parent
    react_dir = script_dir / "monday_backend" / "react_app"
    
    print("🚀 Building Friday React Interface...")
    print(f"React directory: {react_dir}")
    
    # Check if Node.js is installed
    if not run_command("node --version"):
        print("❌ Node.js is not installed. Please install Node.js first.")
        print("   Download from: https://nodejs.org/")
        return False
    
    # Check if npm is installed
    if not run_command("npm --version"):
        print("❌ npm is not installed. Please install npm first.")
        return False
    
    # Install dependencies if node_modules doesn't exist
    if not (react_dir / "node_modules").exists():
        print("📦 Installing React dependencies...")
        if not run_command("npm install", cwd=react_dir):
            print("❌ Failed to install dependencies")
            return False
    
    # Build the React app
    print("🔨 Building React app...")
    if not run_command("npm run build", cwd=react_dir):
        print("❌ Failed to build React app")
        return False
    
    print("✅ React build completed successfully!")
    print("🌐 You can now run: python start_web.py")
    print("📱 The React interface will be available at: http://localhost:5000")
    print("🔗 Classic interface available at: http://localhost:5000/classic")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
