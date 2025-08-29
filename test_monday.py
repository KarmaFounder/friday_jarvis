#!/usr/bin/env python3
"""
Test Monday.com integration
"""

import os
import sys
from pathlib import Path

# Add the monday_backend directory to the path
monday_backend_dir = Path(__file__).parent / "monday_backend"
sys.path.insert(0, str(monday_backend_dir))

from dotenv import load_dotenv
from monday_integration import MondayClient

load_dotenv()

def test_monday_connection():
    """Test Monday.com API connection and task creation"""
    print("🧪 Testing Monday.com Integration")
    print("=" * 50)
    
    # Check API key
    api_key = os.getenv("MONDAY_API_KEY")
    if not api_key:
        print("❌ No MONDAY_API_KEY found in environment variables")
        print("💡 Add your Monday.com API key to .env file:")
        print("   MONDAY_API_KEY=your_api_key_here")
        return False
    
    print(f"✅ API key found: {api_key[:20]}...")
    print(f"🔍 API key starts with: {api_key[:10]}")
    print(f"🔍 API key length: {len(api_key)}")
    
    try:
        # Test connection
        client = MondayClient()
        print("🔗 Testing connection...")
        
        # Test boards listing
        boards = client.get_boards()
        print(f"✅ Connected! Found {len(boards)} boards")
        
        # Find your specific board
        content_board = None
        for board in boards:
            if str(board.get('id')) == "2116067359":
                content_board = board
                break
        
        if content_board:
            print(f"✅ Found Content board: {content_board.get('name')}")
        else:
            print("❌ Content board (ID: 2116067359) not found")
            print("📋 Available boards:")
            for board in boards[:5]:
                print(f"   - {board.get('name')} (ID: {board.get('id')})")
            return False
        
        # Test task creation
        print("\n🎯 Testing task creation...")
        test_task_name = "Friday Test Task - API Integration"
        result = client.create_task("2116067359", test_task_name, "group_mkt6pepv")
        
        if result and result.get('id'):
            print(f"✅ Task created successfully!")
            print(f"   Task ID: {result.get('id')}")
            print(f"   Task Name: {result.get('name')}")
            print(f"   URL: {result.get('url', 'N/A')}")
            return True
        else:
            print(f"❌ Task creation failed")
            print(f"   Response: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_monday_connection()
    if success:
        print("\n🎉 Monday.com integration is working correctly!")
        print("✨ Friday can now create tasks in your CRM board")
    else:
        print("\n🔧 Monday.com integration needs configuration")
        print("📝 Check your API key and board permissions")
    
    sys.exit(0 if success else 1)
