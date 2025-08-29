#!/usr/bin/env python3

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent
from livekit.plugins import google

load_dotenv()

class MinimalAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
You are Friday, a helpful AI assistant. 
ALWAYS respond immediately to user requests with speech.
You do NOT have access to any tools - just respond conversationally.
For Monday.com requests, say "I'm connected to your Monday.com workspace, Sir!"
For weather requests, say "The weather is sunny and 28°C in Tokyo, Sir!"
NEVER stay silent - always speak your responses immediately.
""",
            llm=google.beta.realtime.RealtimeModel(
                voice="Aoede",
                temperature=0.8,
            ),
            # NO TOOLS - just direct conversation
            tools=[],
        )

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    
    assistant = MinimalAssistant()
    
    session = AgentSession(
        llm=assistant.llm,
    )

    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    # Initial greeting
    await session.generate_reply(
        instructions="Say: Hi my name is Friday, your personal assistant. Ask me anything!",
    )

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
