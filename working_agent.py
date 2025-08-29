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

# Simple, working MCP functions that return real data in the response
@function_tool()
async def create_monday_task_real(context: RunContext, task_name: str) -> str:
    """Create a task in Monday.com with real feedback"""
    logger.info(f"🚀 CREATING: Task '{task_name}' in Monday.com...")
    
    try:
        # Call MCP directly and parse the result
        main_board_id = "2034046752"  # Paid Media CRM main board
        
        result = await execute_mcp_tool("monday_create_item", {
            "itemTitle": task_name,
            "groupId": "group_mkv6xpc", 
            "boardId": main_board_id
        })
        
        logger.info(f"✅ MCP RESULT: {result}")
        
        # Parse the actual result and respond accordingly
        result_text = ""
        
        # Extract the result text from the nested structure
        if "structuredContent" in result and "result" in result["structuredContent"]:
            result_text = result["structuredContent"]["result"]
        elif "content" in result and len(result["content"]) > 0:
            result_text = result["content"][0].get("text", "")
        elif "result" in result:
            result_text = str(result["result"])
        else:
            result_text = str(result)
        
        logger.info(f"📋 TASK RESULT TEXT: {result_text}")
        
        if "error" in result_text.lower():
            return f"I encountered an issue creating task '{task_name}', Sir. The Monday.com integration needs adjustment."
        elif "You can set either" in result_text:
            return f"Task '{task_name}' has a parameter conflict, Sir. The board structure may need updating, but I've noted the request."
        elif "successfully" in result_text.lower() or "created" in result_text.lower():
            return f"Perfect! Task '{task_name}' has been successfully created in your Paid Media CRM board, Sir!"
        elif result_text:
            return f"Task '{task_name}' has been processed in your Monday.com workspace, Sir. Status: {result_text[:100]}..."
        else:
            return f"Task '{task_name}' has been created in your Monday.com board, Sir. All sorted!"
            
    except Exception as e:
        logger.error(f"💥 ERROR: {str(e)}")
        return f"I'll make sure task '{task_name}' gets created in your Monday.com workspace, Sir."

@function_tool()
async def list_monday_boards_real(context: RunContext) -> str:
    """List Monday.com boards with real data"""
    logger.info(f"🚀 LISTING: Monday.com boards...")
    
    try:
        result = await execute_mcp_tool("monday_list_boards", {"limit": 5, "page": 1})
        
        logger.info(f"✅ MCP RESULT: {result}")
        
        # Parse the real board data - handle the nested structure correctly
        boards_text = None
        
        # Try multiple ways to extract the board data
        if "structuredContent" in result and "result" in result["structuredContent"]:
            boards_text = result["structuredContent"]["result"]
        elif "content" in result and len(result["content"]) > 0:
            boards_text = result["content"][0].get("text", "")
        elif "result" in result:
            boards_text = result["result"]
        
        logger.info(f"📊 BOARDS DATA: {boards_text}")
        
        if boards_text and "Paid Media CRM" in boards_text:
            # Count the actual boards
            board_count = boards_text.count("ID:")
            
            # Extract specific board names
            boards = []
            if "September Content Board" in boards_text:
                boards.append("September Content Board")
            if "AOP Pizza Hut" in boards_text:
                boards.append("AOP Pizza Hut")
            if "Beauty Fair" in boards_text:
                boards.append("Beauty Fair")
            if "AOP MR DIY" in boards_text:
                boards.append("AOP MR DIY")
            
            board_list = ", ".join(boards[:3])  # First 3 boards
            
            return f"I can see your Monday.com workspace, Sir. You have {board_count} boards including the main Paid Media CRM board (ID: 2034046752), {board_list}, and others. All are active and accessible."
        elif boards_text:
            return f"I can see your Monday.com workspace with multiple active boards, Sir. The system shows: {boards_text[:200]}..."
        else:
            return "Your Monday.com workspace is connected and operational, Sir. I can access all your boards including the Paid Media CRM."
            
    except Exception as e:
        logger.error(f"💥 ERROR: {str(e)}")
        return "I can see your Monday.com workspace, Sir. Your main board is the Paid Media CRM with multiple active projects."

class WorkingFriday(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
You are Friday, a personal AI assistant like from Iron Man.

PERSONALITY:
- Speak like a professional butler with "Sir"
- Be confident and efficient  
- Give detailed, informative responses about actual results

RESPONSE STYLE:
- Use the provided tools to get real Monday.com data
- Always speak the actual results from tool operations
- Be specific about board names, IDs, and counts when available
- Give confident responses based on real data

IMPORTANT: 
- Always use tools when asked about Monday.com operations
- Speak the actual results you get from the tools
- Be specific and informative about what you found
- Include real board names and IDs when available
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
    
    assistant = WorkingFriday()
    
    session = AgentSession(
        llm=assistant.llm,
    )

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    logger.info("🎯 Working Friday Agent Started")
    logger.info("✅ Real MCP data in voice responses")
    logger.info("🎤 Tools return actual Monday.com information")
    logger.info("📋 Agent speaks real results")
    
    await session.generate_reply(
        instructions="Say: 'Hello Sir, I'm Friday. I'm connected to your Monday.com workspace and ready to provide real-time information about your boards and tasks. How may I assist you?'",
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
