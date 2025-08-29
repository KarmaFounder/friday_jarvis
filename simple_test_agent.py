#!/usr/bin/env python3

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, function_tool, RunContext
from livekit.plugins import google
import logging

load_dotenv()

# Simple test function that doesn't involve MCP
@function_tool()
async def simple_test(context: RunContext) -> str:
    """Simple test function that returns a greeting."""
    return "Hello! This is a simple test response from Friday."

@function_tool()
async def test_monday_simple(context: RunContext) -> str:
    """Test Monday function with simple response."""
    return "I'm connected to Monday.com, Sir! Everything is working perfectly."

class SimpleTestAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are Friday, a helpful assistant. When someone asks you to test something, use the available tools and speak the results back.",
            llm=google.beta.realtime.RealtimeModel(
                voice="Aoede",
                temperature=0.8,
            ),
            tools=[
                simple_test,
                test_monday_simple,
            ],
        )

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    
    assistant = SimpleTestAssistant()
    
    session = AgentSession(
        llm=assistant.llm,
    )

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    await session.generate_reply(
        instructions="Say hello and tell me to ask you to test something.",
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
