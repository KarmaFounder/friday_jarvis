import logging
from livekit.agents import function_tool, RunContext
import requests
from langchain_community.tools import DuckDuckGoSearchRun
import os
import smtplib
from email.mime.multipart import MIMEMultipart  
from email.mime.text import MIMEText
from typing import Optional
import json

# Monday.com integration
class MondayClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("MONDAY_API_KEY")
        self.base_url = "https://api.monday.com/v2"
        self.headers = {
            "Authorization": self.api_key if self.api_key else "",
            "Content-Type": "application/json",
            "API-Version": "2023-10"
        }

    def _make_request(self, query: str, variables: Optional[dict] = None):
        payload = {"query": query, "variables": variables or {}}
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            if "errors" in result:
                raise Exception(f"Monday.com API error: {result['errors']}")
            return result
        except requests.exceptions.RequestException as e:
            logging.error(f"Error making request to Monday.com: {e}")
            raise Exception(f"Failed to connect to Monday.com: {str(e)}")

    def create_task(self, board_id: str, task_name: str, group_id: Optional[str] = None):
        query = """
        mutation ($board_id: Int!, $item_name: String!, $group_id: String) {
            create_item (board_id: $board_id, item_name: $item_name, group_id: $group_id) {
                id name created_at url
            }
        }
        """
        variables = {"board_id": int(board_id), "item_name": task_name}
        if group_id:
            variables["group_id"] = group_id
        result = self._make_request(query, variables)
        return result.get("data", {}).get("create_item", {})

@function_tool()
async def get_weather(
    context: RunContext,  # type: ignore
    city: str) -> str:
    """
    Get the current weather for a given city.
    """
    try:
        response = requests.get(
            f"https://wttr.in/{city}?format=3")
        if response.status_code == 200:
            logging.info(f"Weather for {city}: {response.text.strip()}")
            return response.text.strip()   
        else:
            logging.error(f"Failed to get weather for {city}: {response.status_code}")
            return f"Could not retrieve weather for {city}."
    except Exception as e:
        logging.error(f"Error retrieving weather for {city}: {e}")
        return f"An error occurred while retrieving weather for {city}." 

@function_tool()
async def search_web(
    context: RunContext,  # type: ignore
    query: str) -> str:
    """
    Search the web using DuckDuckGo.
    """
    try:
        results = DuckDuckGoSearchRun().run(tool_input=query)
        logging.info(f"Search results for '{query}': {results}")
        return results
    except Exception as e:
        logging.error(f"Error searching the web for '{query}': {e}")
        return f"An error occurred while searching the web for '{query}'."    

@function_tool()    
async def send_email(
    context: RunContext,  # type: ignore
    to_email: str,
    subject: str,
    message: str,
    cc_email: Optional[str] = None
) -> str:
    """
    Send an email through Gmail.
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        message: Email body content
        cc_email: Optional CC email address
    """
    try:
        # Gmail SMTP configuration
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        
        # Get credentials from environment variables
        gmail_user = os.getenv("GMAIL_USER")
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")  # Use App Password, not regular password
        
        if not gmail_user or not gmail_password:
            logging.error("Gmail credentials not found in environment variables")
            return "Email sending failed: Gmail credentials not configured."
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = gmail_user
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add CC if provided
        recipients = [to_email]
        if cc_email:
            msg['Cc'] = cc_email
            recipients.append(cc_email)
        
        # Attach message body
        msg.attach(MIMEText(message, 'plain'))
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Enable TLS encryption
        server.login(gmail_user, gmail_password)
        
        # Send email
        text = msg.as_string()
        server.sendmail(gmail_user, recipients, text)
        server.quit()
        
        logging.info(f"Email sent successfully to {to_email}")
        return f"Email sent successfully to {to_email}"
        
    except smtplib.SMTPAuthenticationError:
        logging.error("Gmail authentication failed")
        return "Email sending failed: Authentication error. Please check your Gmail credentials."
    except smtplib.SMTPException as e:
        logging.error(f"SMTP error occurred: {e}")
        return f"Email sending failed: SMTP error - {str(e)}"
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return f"An error occurred while sending email: {str(e)}"

@function_tool()
async def create_monday_task(
    context: RunContext,  # type: ignore
    task_name: str,
    board_id: str,
    group_id: Optional[str] = None
) -> str:
    """
    Create a new task in Monday.com board.
    
    Args:
        task_name: The name/title of the task to create
        board_id: The ID of the Monday.com board to add the task to
        group_id: Optional group/section ID within the board
    """
    try:
        client = MondayClient()
        result = client.create_task(board_id, task_name, group_id)
        
        if result:
            task_id = result.get('id')
            task_url = result.get('url', '')
            logging.info(f"Created Monday.com task: {task_name} (ID: {task_id})")
            
            response = f"Will do, Sir! I've created the task '{task_name}' in your Monday.com board."
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
        
        result = client.create_task(board_id, task_name, group_id)
        print(f"🔍 Task creation result: {result}")
        
        if result and result.get('id'):
            task_id = result.get('id')
            task_url = result.get('url', '')
            logging.info(f"Created CRM task: {task_name} (ID: {task_id})")
            
            response = f"Roger that, Sir! Created '{task_name}' in your Paid Media CRM board under AI Agent Operations. Task is ready for action."
            if task_url:
                response += f" Task URL: {task_url}"
            return response
        else:
            print(f"❌ Task creation failed. Result: {result}")
            return f"Something went sideways creating that task, Sir. The API returned: {result}. Let me check your Monday.com configuration."
            
    except Exception as e:
        logging.error(f"Error creating CRM task: {e}")
        return f"I encountered a technical snag creating that task, Sir: {str(e)}"