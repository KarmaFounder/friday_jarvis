# monday_tools.py

# This is a Python representation of the functions available in the MCP server.
# It tells Gemini what tools it can call.
MONDAY_TOOL_DEFINITIONS = [
    {
        "name": "monday-create-item",
        "description": "Creates a new item or task within the 'Paid Media CRM' board.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "The name of the task to create."
                },
                "group_id": {
                    "type": "string",
                    "description": "The ID of the group to create the task in (e.g., 'group_mkv6xpc' for AI Agent Operations)."
                }
            },
            "required": ["item_name", "group_id"]
        }
    },
    {
        "name": "monday-get-board-groups",
        "description": "Retrieves all groups from the 'Paid Media CRM' board to find a group_id.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "monday-list-items",
        "description": "Lists all items/tasks from the 'Paid Media CRM' board.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default: 10)"
                }
            }
        }
    },
    {
        "name": "monday-update-item",
        "description": "Updates an existing item/task in the 'Paid Media CRM' board.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_id": {
                    "type": "string",
                    "description": "The ID of the item to update"
                },
                "updates": {
                    "type": "object",
                    "description": "The updates to apply to the item"
                }
            },
            "required": ["item_id", "updates"]
        }
    }
    # Add other tool definitions here as you implement them in your MCP server
]

# Legacy tool definitions for LiveKit agent (non-MCP tools)
LEGACY_TOOL_DEFINITIONS = [
    {
        "name": "get_weather",
        "description": "Get current weather information for a specified city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "The city name to get weather for"
                }
            },
            "required": ["city"]
        }
    },
    {
        "name": "search_web",
        "description": "Search the web using DuckDuckGo search engine.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string", 
                    "description": "The search query"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "send_email",
        "description": "Send an email through Gmail SMTP.",
        "parameters": {
            "type": "object",
            "properties": {
                "to_email": {
                    "type": "string",
                    "description": "Recipient email address"
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line"
                },
                "message": {
                    "type": "string",
                    "description": "Email body content"
                },
                "cc_email": {
                    "type": "string",
                    "description": "Optional CC email address"
                }
            },
            "required": ["to_email", "subject", "message"]
        }
    }
]

# Combined tool definitions for Gemini
ALL_TOOL_DEFINITIONS = MONDAY_TOOL_DEFINITIONS + LEGACY_TOOL_DEFINITIONS
