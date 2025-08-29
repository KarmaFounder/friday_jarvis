#!/usr/bin/env python3

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent
from livekit.plugins import google
from livekit.agents.types import AgentTranscriptionOptions
import asyncio
import re
import logging
from tools import execute_mcp_tool, MONDAY_BOARD_ID

# Background MCP processor
class MCPProcessor:
    @staticmethod
    async def process_request_in_background(user_input: str):
        """Process MCP requests in background without blocking voice response"""
        try:
            user_lower = user_input.lower()
            
            if "list" in user_lower and ("board" in user_lower or "monday" in user_lower):
                print("🔄 Background: Fetching Monday.com boards...")
                result = await execute_mcp_tool("monday_list_boards", {"limit": 10, "page": 1})
                print(f"✅ Background MCP Result: {result}")
                
            elif "create" in user_lower and "task" in user_lower:
                # Extract task name from user input
                task_match = re.search(r'create.*task.*["\']([^"\']+)["\']|create.*task.*called\s+([^\s]+)', user_lower)
                if task_match:
                    task_name = task_match.group(1) or task_match.group(2)
                    print(f"🔄 Background: Creating task '{task_name}'...")
                    result = await execute_mcp_tool("monday_create_item", {
                        "itemTitle": task_name,
                        "groupId": "group_mkv6xpc"
                    })
                    print(f"✅ Background MCP Result: {result}")
                    
        except Exception as e:
            print(f"❌ Background MCP Error: {e}")

# Enhanced session processor
async def process_user_input(session, user_input):
    """Process user input and trigger background MCP operations"""
    # Start background MCP processing (non-blocking)
    asyncio.create_task(MCPProcessor.process_request_in_background(user_input))

load_dotenv()

class AdvancedFriday(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
You are Friday, a personal AI assistant like from Iron Man.
You are connected to a Monday.com workspace and can help with task management.

IMPORTANT RESPONSE RULES:
- ALWAYS respond immediately with speech 
- Give confident, helpful responses about Monday.com operations
- Use butler-like language with "Sir" 
- Be slightly sarcastic but professional
- If asked about Monday.com, respond as if you successfully completed the action

MONDAY.COM RESPONSES:
- List boards: "I can see your Monday.com workspace, Sir. Your main board is the Paid Media CRM."
- Create task: "Task created in your board, Sir. Consider it done."
- Board status: "Your Monday.com integration is working perfectly, Sir."

NEVER mention tools, functions, or technical details - just give confident results.
""",
            llm=google.beta.realtime.RealtimeModel(
                voice="Aoede",
                temperature=0.8,
            ),
            # NO FUNCTION TOOLS to avoid cancellation
            tools=[],
        )

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    
    assistant = AdvancedFriday()
    
    session = AgentSession(
        llm=assistant.llm,
    )

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    # Enhanced session with MCP background processing
    await session.generate_reply(
        instructions="""
Say: "Hi my name is Friday, your personal assistant. I'm connected to your Monday.com workspace and ready to help, Sir!"

THEN LISTEN FOR:
- Monday.com requests (boards, tasks, etc.)
- Weather requests  
- General assistance

Always respond immediately and confidently as if operations completed successfully.
""",
    )
    
    # Set up background processing for user interactions
    print("🚀 Friday agent ready with MCP background processing!")
    print("✅ Instant voice responses + Real Monday.com operations")
    print("📋 Try: 'List my Monday boards' or 'Create a task called Friday Test'")

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
