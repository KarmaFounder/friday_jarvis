import logging
from livekit.agents import function_tool, RunContext
from typing import Optional
from .monday_integration import MondayClient

@function_tool()
async def create_monday_task(
    context: RunContext,  # type: ignore
    task_name: str,
    group_id: Optional[str] = None
) -> str:
    """
    Create a new task in the locked Monday.com board.
    The board is automatically enforced from environment configuration.
    
    Args:
        task_name: The name/title of the task to create
        group_id: Optional group/section ID within the board (e.g., 'group_mkt6pepv')
    """
    try:
        client = MondayClient()
        result = client.create_task(task_name, group_id)
        
        if result:
            task_id = result.get('id')
            task_url = result.get('url', '')
            logging.info(f"Created Monday.com task: {task_name} (ID: {task_id})")
            
            response = f"Roger that, Sir! I've created the task '{task_name}' in your Monday.com board."
            if task_url:
                response += f" You can view it here: {task_url}"
            
            return response
        else:
            logging.error(f"Failed to create Monday.com task: {task_name}")
            return f"Apologies, Sir, but I encountered an issue creating the task '{task_name}' in Monday.com."
            
    except Exception as e:
        logging.error(f"Error creating Monday.com task: {e}")
        return f"I'm afraid there was a problem creating your task, Sir: {str(e)}"

@function_tool()
async def list_monday_boards(
    context: RunContext  # type: ignore
) -> str:
    """
    List all Monday.com boards accessible to the user.
    """
    try:
        client = MondayClient()
        boards = client.get_boards()
        
        if not boards:
            return "It appears you have no Monday.com boards accessible, Sir."
        
        # Create a concise summary instead of listing every board
        total_count = len(boards)
        if total_count <= 3:
            # If 3 or fewer boards, list them by name only
            board_names = [board.get('name', 'Unnamed Board') for board in boards]
            board_list = f"You have {total_count} boards: {', '.join(board_names)}."
        else:
            # If more than 3, just give a summary
            board_list = f"You have {total_count} Monday.com boards available. "
            sample_names = [board.get('name', 'Unnamed Board') for board in boards[:3]]
            board_list += f"Including {', '.join(sample_names)}, and {total_count - 3} others."
        
        logging.info(f"Listed {len(boards)} Monday.com boards")
        return board_list
        
    except Exception as e:
        logging.error(f"Error listing Monday.com boards: {e}")
        return f"I'm having trouble accessing your Monday.com boards, Sir: {str(e)}"

@function_tool()
async def search_monday_tasks(
    context: RunContext,  # type: ignore
    board_id: str,
    search_term: str
) -> str:
    """
    Search for tasks in a Monday.com board.
    
    Args:
        board_id: The ID of the Monday.com board to search in
        search_term: The term to search for in task names
    """
    try:
        client = MondayClient()
        tasks = client.search_tasks(board_id, search_term)
        
        if not tasks:
            return f"No tasks found matching '{search_term}' in that board, Sir."
        
        task_list = f"Found {len(tasks)} task(s) matching '{search_term}':\n"
        for task in tasks[:10]:  # Limit to first 10 results
            task_name = task.get('name', 'Unnamed Task')
            task_id = task.get('id')
            task_list += f"• {task_name} (ID: {task_id})\n"
        
        if len(tasks) > 10:
            task_list += f"... and {len(tasks) - 10} more tasks."
        
        logging.info(f"Found {len(tasks)} tasks matching '{search_term}'")
        return task_list
        
    except Exception as e:
        logging.error(f"Error searching Monday.com tasks: {e}")
        return f"I encountered an issue searching for tasks, Sir: {str(e)}"

@function_tool()
async def add_task_update(
    context: RunContext,  # type: ignore
    task_id: str,
    update_text: str
) -> str:
    """
    Add an update/comment to a Monday.com task.
    
    Args:
        task_id: The ID of the task to update
        update_text: The update text to add
    """
    try:
        client = MondayClient()
        result = client.add_task_update(task_id, update_text)
        
        if result:
            logging.info(f"Added update to Monday.com task {task_id}")
            return f"Will do, Sir! I've added your update to the task."
        else:
            return f"I had trouble adding the update to that task, Sir."
            
    except Exception as e:
        logging.error(f"Error adding task update: {e}")
        return f"There was an issue adding your update, Sir: {str(e)}"

@function_tool()
async def create_crm_task(
    context: RunContext,  # type: ignore
    task_name: str
) -> str:
    """
    Create a task in the Paid Media CRM board under AI Agent Operations.
    
    Args:
        task_name: The name/title of the task to create
    """
    try:
        client = MondayClient()
        board_id = "2116067359"  # September Content Board
        group_id = "group_mkt6pepv"  # TikToks group
        
        result = client.create_task(task_name, group_id)
        
        if result:
            task_id = result.get('id')
            task_url = result.get('url', '')
            logging.info(f"Created CRM task: {task_name} (ID: {task_id})")
            
            return f"Roger that, Sir! Created '{task_name}' in your Paid Media CRM board under AI Agent Operations. Task is locked and loaded."
        else:
            return f"Something went sideways creating that task, Sir. Shall I try again?"
            
    except Exception as e:
        logging.error(f"Error creating CRM task: {e}")
        return f"I encountered a technical snag creating that task, Sir: {str(e)}"

@function_tool()
async def list_crm_tasks(
    context: RunContext  # type: ignore
) -> str:
    """
    List tasks from the Paid Media CRM board.
    """
    try:
        client = MondayClient()
        board_id = "2116067359"  # September Content Board
        
        tasks = client.search_tasks("")  # Get all tasks
        
        if not tasks:
            return "The Paid Media CRM board appears to be empty, Sir."
        
        if len(tasks) <= 5:
            task_names = [task.get('name', 'Unnamed Task') for task in tasks]
            return f"You have {len(tasks)} tasks in Paid Media CRM: {', '.join(task_names)}."
        else:
            recent_tasks = [task.get('name', 'Unnamed Task') for task in tasks[:3]]
            return f"You have {len(tasks)} tasks in Paid Media CRM. Most recent: {', '.join(recent_tasks)}, plus {len(tasks) - 3} others."
        
    except Exception as e:
        logging.error(f"Error listing CRM tasks: {e}")
        return f"I'm having trouble accessing your CRM tasks, Sir: {str(e)}"
