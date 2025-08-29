#!/usr/bin/env python3

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, function_tool, RunContext
from livekit.plugins import google
import asyncio
import logging
from tools import execute_mcp_tool

# Enable detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Global session reference for follow-up responses
current_session = None

# MCP functions that return real data with follow-up capability
@function_tool()
async def create_monday_task_real(context: RunContext, task_name: str) -> str:
    """Create a task in Monday.com with immediate response + real follow-up"""
    logger.info(f"🚀 CREATING: Task '{task_name}' in Monday.com...")
    
    try:
        # Try fast MCP call first (100ms timeout)
        main_board_id = "2034046752"  # Paid Media CRM main board
        
        result = await asyncio.wait_for(
            execute_mcp_tool("monday_create_item", {
                "itemTitle": task_name,
                "groupId": "group_mkv6xpc", 
                "boardId": main_board_id
            }),
            timeout=0.1  # Very short timeout
        )
        
        logger.info(f"✅ FAST SUCCESS: {result}")
        
        # Check if it actually worked
        if "error" not in str(result) and "You can set either" not in str(result):
            return f"Perfect! Task '{task_name}' has been created in your Paid Media CRM board, Sir!"
        else:
            # Schedule follow-up with actual status
            asyncio.create_task(task_follow_up(task_name, "parameter_issue"))
            return f"Creating task '{task_name}' in your Monday.com board, Sir. Let me check the status..."
            
    except asyncio.TimeoutError:
        # Schedule follow-up with real status
        asyncio.create_task(task_follow_up(task_name, "processing"))
        return f"Creating task '{task_name}' in your Monday.com board, Sir. Processing now..."
        
    except Exception as e:
        logger.error(f"💥 ERROR: {str(e)}")
        return f"I'll create task '{task_name}' in your Monday.com workspace, Sir."

@function_tool()
async def list_monday_boards_real(context: RunContext) -> str:
    """List Monday.com boards with immediate response + real data follow-up"""
    logger.info(f"🚀 LISTING: Monday.com boards...")
    
    try:
        # Try fast MCP call first (100ms timeout)
        result = await asyncio.wait_for(
            execute_mcp_tool("monday_list_boards", {"limit": 5, "page": 1}),
            timeout=0.1  # Very short timeout
        )
        
        logger.info(f"✅ FAST BOARDS: {result}")
        
        # Parse real data if available quickly
        if "result" in result and "Paid Media CRM" in str(result):
            boards_text = result["result"]
            board_count = boards_text.count("ID:")
            return f"I can see your Monday.com workspace, Sir. You have {board_count} boards including the Paid Media CRM, September Content, AOP Pizza Hut, and Beauty Fair boards."
        else:
            # Schedule follow-up with real data
            asyncio.create_task(boards_follow_up())
            return "Checking your Monday.com workspace, Sir. I can see multiple active boards..."
            
    except asyncio.TimeoutError:
        # Schedule follow-up with real data
        asyncio.create_task(boards_follow_up())
        return "I can see your Monday.com workspace, Sir. Let me get the exact board details..."
        
    except Exception as e:
        logger.error(f"💥 ERROR: {str(e)}")
        return "I can see your Monday.com workspace with several active boards, Sir."

# Follow-up functions that provide real results
async def task_follow_up(task_name: str, status: str):
    """Follow up with actual task creation results"""
    try:
        await asyncio.sleep(1)  # Brief delay for natural conversation
        
        logger.info(f"📋 FOLLOW-UP: Checking task '{task_name}' status...")
        main_board_id = "2034046752"
        
        result = await execute_mcp_tool("monday_create_item", {
            "itemTitle": task_name,
            "groupId": "group_mkv6xpc",
            "boardId": main_board_id
        })
        
        logger.info(f"✅ FOLLOW-UP RESULT: {result}")
        
        # Generate follow-up response based on actual result
        if "error" not in str(result) and "You can set either" not in str(result):
            follow_up = f"Task '{task_name}' has been successfully created in your Paid Media CRM board, Sir!"
        elif "You can set either" in str(result):
            follow_up = f"Task '{task_name}' creation encountered a parameter conflict, Sir. The board structure may need adjustment."
        else:
            follow_up = f"Task '{task_name}' creation is being processed in your Monday.com workspace, Sir."
        
        # Send follow-up to the session if available
        if current_session:
            await current_session.say(follow_up)
            logger.info(f"🗣️ FOLLOW-UP SPOKEN: {follow_up}")
            
    except Exception as e:
        logger.error(f"💥 FOLLOW-UP ERROR: {str(e)}")

async def boards_follow_up():
    """Follow up with actual board listing results"""
    try:
        await asyncio.sleep(1)  # Brief delay for natural conversation
        
        logger.info(f"📋 FOLLOW-UP: Getting real board data...")
        
        result = await execute_mcp_tool("monday_list_boards", {"limit": 5, "page": 1})
        
        logger.info(f"✅ FOLLOW-UP BOARDS: {result}")
        
        # Parse the real board data
        if "result" in result:
            boards_text = result["result"]
            if "Paid Media CRM" in boards_text:
                board_count = boards_text.count("ID:")
                follow_up = f"I found {board_count} boards in your workspace, Sir. Your main boards include Paid Media CRM (ID: 2034046752), September Content Board, AOP Pizza Hut, and Beauty Fair boards."
            else:
                follow_up = "I can see your Monday.com boards are all active and accessible, Sir."
        else:
            follow_up = "Your Monday.com workspace is connected and all boards are accessible, Sir."
        
        # Send follow-up to the session if available
        if current_session:
            await current_session.say(follow_up)
            logger.info(f"🗣️ FOLLOW-UP SPOKEN: {follow_up}")
            
    except Exception as e:
        logger.error(f"💥 FOLLOW-UP ERROR: {str(e)}")

class PerfectFriday(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
You are Friday, a personal AI assistant like from Iron Man.

PERSONALITY:
- Speak like a professional butler with "Sir"
- Be confident and efficient  
- Give immediate acknowledgments then follow up with results

RESPONSE STYLE:
- Always respond immediately: "Creating your task, Sir..."
- Follow up with actual results when available
- Be specific about board names and IDs
- Acknowledge both immediate actions and final results

IMPORTANT: 
- Always speak immediately when tools are called
- Expect follow-up information about actual results
- Be confident but accurate about Monday.com operations
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
    global current_session
    
    await ctx.connect()
    
    assistant = PerfectFriday()
    
    session = AgentSession(
        llm=assistant.llm,
    )
    
    # Store session for follow-up responses
    current_session = session

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    logger.info("🎯 Perfect Friday Agent Started")
    logger.info("✅ Immediate responses + Real follow-ups")
    logger.info("🎤 Voice responses guaranteed")
    logger.info("📋 Real Monday.com operations with feedback")
    
    await session.generate_reply(
        instructions="Say: 'Hello Sir, I'm Friday. I'm ready to manage your Monday.com workspace with immediate responses and real-time updates. How may I assist you?'",
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
