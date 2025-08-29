# Friday Agent - MCP Integration Guide

## 🎯 Overview

Your Friday agent has been successfully refactored to use a **Model Context Protocol (MCP) orchestrator** for Monday.com operations. This provides enhanced security, reliability, and maintainability.

## 🏗️ Architecture

### Before (Direct GraphQL)
```
LiveKit Agent → Direct GraphQL → Monday.com API
```

### After (MCP Orchestrator)
```
LiveKit Agent → MCP Client → MCP Server → Monday.com API
```

## 🔧 Key Components

### 1. Environment Configuration (`.env`)
```bash
# Monday.com Configuration
MONDAY_API_KEY="your_monday_api_key"
MONDAY_BOARD_ID="2116448730"  # Paid Media CRM board (locked)

# MCP Server Configuration  
MCP_SERVER_URL="http://localhost:8000/api/mcp/invoke"

# LiveKit Configuration
GOOGLE_API_KEY="your_google_api_key"
LIVEKIT_URL="your_livekit_url"
LIVEKIT_API_KEY="your_livekit_api_key"
LIVEKIT_API_SECRET="your_livekit_secret"
```

### 2. MCP Client (`tools.py`)
- **Purpose**: Communicates with your self-hosted MCP server
- **Security**: Automatically enforces `MONDAY_BOARD_ID` on every call
- **Function**: `execute_mcp_tool(tool_name, parameters)` → MCP Server

### 3. Tool Definitions (`monday_tools.py`)
- **Purpose**: Defines available MCP tools for Gemini
- **Tools**: 
  - `monday-create-item`
  - `monday-get-board-groups`
  - `monday-list-items`
  - `monday-update-item`

### 4. LiveKit Function Tools (`tools.py`)
- **Purpose**: LiveKit-compatible wrappers around MCP calls
- **Functions**:
  - `create_monday_task()` → Uses MCP
  - `create_crm_task()` → Uses MCP  
  - `list_monday_boards()` → Uses MCP
  - `get_weather()` → Direct API (legacy)
  - `search_web()` → Direct API (legacy)
  - `send_email()` → Direct API (legacy)

### 5. Agent Core (`agent.py`)
- **Purpose**: LiveKit agent with Gemini RealtimeModel
- **Integration**: Uses MCP-powered function tools
- **Security**: All Monday.com operations locked to specific board

## 🛡️ Security Features

### Board Lock-Down
- All Monday.com operations are **automatically locked** to board ID `2116448730`
- Even if a user requests a different board, the system enforces the configured board
- The agent cannot access other boards, providing data isolation

### MCP Orchestration
- No direct GraphQL queries in the agent code
- All Monday.com operations go through the secure MCP server
- Centralized error handling and logging
- Standardized API interface

## 🚀 Usage

### Starting the Agent

1. **Ensure MCP Server is Running**:
   ```bash
   # Your MCP server should be running on localhost:8000
   curl http://localhost:8000/health  # Check if alive
   ```

2. **Start LiveKit Agent**:
   ```bash
   source venv/bin/activate
   python agent.py console
   ```

### Voice Commands

The agent now supports secure Monday.com operations:

- **"Create a task called 'Review Q4 budget'"**
  - → Uses MCP to create task in locked board
  
- **"List my Monday boards"** 
  - → Returns info about locked board scope
  
- **"Add a CRM task for follow-up call"**
  - → Creates task in AI Agent Operations group

## 🧪 Testing

### Test MCP Integration
```bash
python test_mcp_integration.py
```
Tests direct MCP server communication.

### Test Function Tools  
```bash
python test_function_tools.py
```
Tests LiveKit function tool wrappers.

### Test Full Agent
```bash
python agent.py console
```
Test the complete voice agent experience.

## 🔍 Troubleshooting

### Common Issues

1. **"MCP server failed" errors**
   - Check if MCP server is running: `curl http://localhost:8000/health`
   - Verify `MCP_SERVER_URL` in `.env`

2. **"Board not found" errors**
   - Verify `MONDAY_BOARD_ID` is correct
   - Check `MONDAY_API_KEY` permissions

3. **"Group not found" errors**
   - Use `monday-get-board-groups` to see available groups
   - Update group IDs in tool calls

### Debug Mode

Enable verbose logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📊 Benefits of MCP Architecture

### For Development
- **Separation of Concerns**: Agent logic separated from API details
- **Reusability**: MCP server can serve multiple agents/clients
- **Testing**: Easy to mock and test individual components

### For Security  
- **Centralized Access Control**: All Monday.com access through one point
- **Board Isolation**: Impossible to accidentally access wrong board
- **Audit Trail**: All operations logged in MCP server

### For Maintenance
- **Version Control**: API changes handled in MCP server only
- **Error Handling**: Centralized error handling and retry logic  
- **Monitoring**: Single point to monitor Monday.com API usage

## 🎉 You're Ready!

Your Friday agent is now a secure, MCP-powered assistant that:
- ✅ Only accesses your designated Monday.com board
- ✅ Routes all Monday.com operations through secure MCP server  
- ✅ Maintains voice interaction capabilities
- ✅ Supports weather, web search, and email tools
- ✅ Provides enhanced error handling and logging

**Next Steps**: Start your MCP server, then launch the agent with `python agent.py console` and start talking to Friday!
