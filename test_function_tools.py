#!/usr/bin/env python3
"""
Test script for the LiveKit function tools (Monday.com MCP integration)
"""

import asyncio
import os
from dotenv import load_dotenv
from livekit.agents import RunContext
from tools import create_monday_task, create_crm_task, list_monday_boards

# Load environment variables
load_dotenv()

class MockRunContext(RunContext):
    """Mock RunContext for testing"""
    pass

async def test_function_tools():
    """Test the LiveKit function tools that use MCP"""
    
    print("🧪 Testing LiveKit Function Tools (MCP Integration)")
    print("=" * 60)
    
    # Create mock context
    context = MockRunContext()
    
    try:
        # Test 1: List Monday boards (should indicate board lock)
        print("🔍 Test 1: List Monday boards...")
        boards_result = await list_monday_boards(context)
        print(f"📋 Result: {boards_result}")
        print()
        
        # Test 2: Create a Monday task
        print("🔍 Test 2: Create Monday task...")
        task_result = await create_monday_task(
            context, 
            "Friday Function Tool Test", 
            "group_mkv6xpc"
        )
        print(f"📝 Result: {task_result}")
        print()
        
        # Test 3: Create CRM task (uses default group)
        print("🔍 Test 3: Create CRM task...")
        crm_result = await create_crm_task(
            context,
            "Friday CRM Function Test"
        )
        print(f"📊 Result: {crm_result}")
        print()
        
        print("🎉 Function tools test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Note: This test requires your MCP server to be running on localhost:8000")
    print("If the MCP server is not running, the tests will show connection errors.")
    print()
    
    success = asyncio.run(test_function_tools())
    if success:
        print("\n✅ Function tools are working! Ready for LiveKit agent.")
    else:
        print("\n❌ Function tools test failed. Check MCP server and configuration.")
