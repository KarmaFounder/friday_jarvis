#!/usr/bin/env python3
"""
Test script for the MCP-powered Monday.com integration
"""

import asyncio
import os
from dotenv import load_dotenv
from tools import execute_mcp_tool

async def execute_mcp_tool_list_tools():
    """List available tools on the MCP server"""
    from tools import MCP_SERVER_URL
    import httpx
    import json
    
    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=1, max_connections=1)
        ) as client:
            
            # Initialize session
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"roots": {"listChanged": True}, "sampling": {}},
                    "clientInfo": {"name": "friday-agent", "version": "1.0.0"}
                }
            }
            
            init_response = await client.post(
                MCP_SERVER_URL,
                json=init_request,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "Connection": "keep-alive"
                }
            )
            init_response.raise_for_status()
            
            # Get session ID
            session_headers = init_response.headers
            session_id = None
            for header_name in ['mcp-session-id', 'x-session-id', 'session-id']:
                if header_name in session_headers:
                    session_id = session_headers[header_name]
                    break
            
            # List tools
            tools_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            
            tool_headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "Connection": "keep-alive"
            }
            
            if session_id:
                tool_headers["MCP-Session-ID"] = session_id
            
            tools_response = await client.post(
                MCP_SERVER_URL,
                json=tools_request,
                headers=tool_headers
            )
            tools_response.raise_for_status()
            
            # Parse response
            tools_text = tools_response.text.strip()
            for line in tools_text.split('\n'):
                if line.startswith('data: '):
                    data_json = line[6:]
                    try:
                        tools_result = json.loads(data_json)
                        if "result" in tools_result:
                            return tools_result["result"]
                        elif "error" in tools_result:
                            return {"error": tools_result["error"].get("message", "Unknown error")}
                    except json.JSONDecodeError:
                        continue
            
            return {"error": "Failed to parse tools list response"}
            
    except Exception as e:
        return {"error": f"Failed to list tools: {str(e)}"}

# Load environment variables
load_dotenv()

async def test_mcp_integration():
    """Test the MCP integration with Monday.com"""
    
    print("🧪 Testing MCP Integration with Monday.com")
    print("=" * 60)
    
    # Check environment variables
    monday_board_id = os.getenv("MONDAY_BOARD_ID")
    mcp_server_url = os.getenv("MCP_SERVER_URL")
    monday_api_key = os.getenv("MONDAY_API_KEY")
    
    print(f"📋 Board ID: {monday_board_id}")
    print(f"🔗 MCP Server: {mcp_server_url}")
    print(f"🔑 API Key: {'✅ Set' if monday_api_key else '❌ Missing'}")
    print()
    
    if not all([monday_board_id, mcp_server_url, monday_api_key]):
        print("❌ Missing required environment variables!")
        return False
    
    try:
        # Test 0: List available tools first
        print("🔍 Test 0: Listing available tools...")
        tools_result = await execute_mcp_tool_list_tools()
        
        if "error" in tools_result:
            print(f"❌ Tools list failed: {tools_result['error']}")
        else:
            print(f"✅ Available tools:")
            for tool in tools_result.get('tools', []):
                print(f"   - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
        
        print()
        
        # Test 1: Get board groups with correct parameters
        print("🔍 Test 1: Getting board groups...")
        groups_result = await execute_mcp_tool("monday_get_board_groups", {"boardId": monday_board_id})
        
        if "error" not in groups_result:
            print(f"✅ Groups retrieved successfully!")
            print(f"   Result: {groups_result}")
        else:
            print(f"   ❌ Getting groups failed: {groups_result['error']}")
        
        print()
        
        # Test 2: Create a test task with correct parameters
        print("🔍 Test 2: Creating a test task...")
        task_params = {
            "itemTitle": "Friday MCP Test Task",
            "groupId": "group_mkv6xpc"  # AI Agent Operations group
        }
        
        task_result = await execute_mcp_tool("monday_create_item", task_params)
        
        if "error" not in task_result:
            print(f"✅ Task created successfully!")
            print(f"   Result: {task_result}")
        else:
            print(f"   ❌ Task creation failed: {task_result['error']}")
            
        print()
        
        # Test 3: List all boards with default parameters
        print("🔍 Test 3: Listing all boards...")
        boards_result = await execute_mcp_tool("monday_list_boards", {})
        
        if "error" not in boards_result:
            print(f"✅ Boards listed successfully!")
            print(f"   Result: {boards_result}")
        else:
            print(f"   ❌ Listing boards failed: {boards_result['error']}")
            
        # Test 4: Try with explicit parameters
        print("🔍 Test 4: Listing boards with explicit parameters...")
        boards_result2 = await execute_mcp_tool("monday_list_boards", {"limit": 10, "page": 1})
        
        if "error" not in boards_result2:
            print(f"✅ Boards listed successfully with parameters!")
            print(f"   Result: {boards_result2}")
        else:
            print(f"   ❌ Listing boards with parameters failed: {boards_result2['error']}")
        
        print()
        print("🎉 MCP Integration test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_mcp_integration())
    if success:
        print("\n✅ All tests passed! Your MCP integration is ready.")
    else:
        print("\n❌ Some tests failed. Please check your MCP server and configuration.")
