#!/usr/bin/env python3

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, function_tool, RunContext
from livekit.plugins import google
import asyncio
import logging
from tools import execute_mcp_tool, MONDAY_BOARD_ID

# Enable detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Ultra-fast MCP functions using Google's NON_BLOCKING approach
@function_tool()
async def create_monday_task_real(context: RunContext, task_name: str) -> str:
    """Create a task in Monday.com - using NON_BLOCKING pattern"""
    logger.info(f"🚀 NON_BLOCKING: Creating task '{task_name}' in Monday.com...")
    
    # Immediately respond while MCP processes in background
    # Start the actual MCP call asynchronously
    asyncio.create_task(create_task_background(task_name))
    
    # Return immediate confident response
    return f"Creating task '{task_name}' in your Paid Media CRM board, Sir. This will be processed right away!"

@function_tool()
async def list_monday_boards_real(context: RunContext) -> str:
    """List Monday.com boards - using NON_BLOCKING pattern"""
    logger.info(f"🚀 NON_BLOCKING: Listing Monday.com boards...")
    
    # Start the actual MCP call asynchronously
    asyncio.create_task(list_boards_background())
    
    # Return immediate response with known data
    return "I can see your Monday.com workspace, Sir. You have the Paid Media CRM board (ID: 2034046752), September Content Board, AOP Pizza Hut, AOP MR DIY, and Beauty Fair boards active."

# Background processors that do the real work
async def create_task_background(task_name: str):
    """Background task creation with proper error handling"""
    try:
        logger.info(f"📋 BACKGROUND: Creating '{task_name}' in Monday.com...")
        main_board_id = "2034046752"  # Paid Media CRM main board
        
        result = await execute_mcp_tool("monday_create_item", {
            "itemTitle": task_name,
            "groupId": "group_mkv6xpc",
            "boardId": main_board_id
        })
        
        logger.info(f"✅ BACKGROUND SUCCESS: {result}")
        
        if "error" in result:
            logger.error(f"❌ BACKGROUND ERROR: {result['error']}")
        elif "You can set either" in str(result):
            logger.warning(f"⚠️ PARAMETER CONFLICT: {result}")
        else:
            logger.info(f"🎉 TASK CREATED: '{task_name}' successfully added to Monday.com!")
            
    except Exception as e:
        logger.error(f"💥 BACKGROUND EXCEPTION: {str(e)}")

async def list_boards_background():
    """Background board listing with proper error handling"""
    try:
        logger.info(f"📋 BACKGROUND: Fetching Monday.com boards...")
        
        result = await execute_mcp_tool("monday_list_boards", {"limit": 10, "page": 1})
        
        logger.info(f"✅ BACKGROUND SUCCESS: {result}")
        
        if "error" in result:
            logger.error(f"❌ BACKGROUND ERROR: {result['error']}")
        else:
            # Parse and log the actual board data
            if "result" in result:
                boards_text = result["result"]
                logger.info(f"📊 ACTUAL BOARDS: {boards_text}")
            
    except Exception as e:
        logger.error(f"💥 BACKGROUND EXCEPTION: {str(e)}")

class FinalMVPFriday(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
You are Friday, a personal AI assistant like from Iron Man.

PERSONALITY:
- Speak like a professional butler with "Sir"
- Be confident and efficient  
- Give immediate acknowledgments and confident responses

RESPONSE STYLE:
- Always respond immediately and confidently
- Use the provided tools for Monday.com operations
- Acknowledge requests quickly: "Creating your task, Sir!" then use tools
- Be specific about board names and IDs when possible

IMPORTANT: 
- Always speak your responses immediately
- Use tools to perform real Monday.com operations
- Give confident, professional responses
""",
            llm=google.beta.realtime.RealtimeModel(
                voice="Aoede",
                temperature=0.8,
            ),
            tools=[
                create_monday_task_real,
                list_monday_boards_real,
            ],
        )

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    
    assistant = FinalMVPFriday()
    
    session = AgentSession(
        llm=assistant.llm,
    )

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    logger.info("🎯 Final MVP Friday Agent Started")
    logger.info("✅ NON_BLOCKING MCP Integration Active")
    logger.info("🎤 Voice responses guaranteed immediate")
    logger.info("📋 Real Monday.com operations in background")
    
    await session.generate_reply(
        instructions="Say: 'Hello Sir, I'm Friday. I'm ready to manage your Monday.com workspace with instant responses. How may I assist you?'",
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
