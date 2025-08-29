import os
import requests
import json
from typing import Optional, Dict, Any
import logging
from datetime import datetime

class MondayClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("MONDAY_API_KEY")
        self.base_url = "https://api.monday.com/v2"
        self.headers = {
            "Authorization": self.api_key if self.api_key else "",
            "Content-Type": "application/json",
            "API-Version": "2023-10"
        }
        
        # Enforce the specific board ID from environment
        self.enforced_board_id = os.getenv("MONDAY_BOARD_ID")
        if not self.enforced_board_id:
            raise ValueError("MONDAY_BOARD_ID environment variable is required but not set")

    def _make_request(self, query: str, variables: Optional[Dict] = None) -> Dict[Any, Any]:
        """Make a GraphQL request to Monday.com API"""
        payload = {
            "query": query,
            "variables": variables or {}
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            if "errors" in result:
                raise Exception(f"Monday.com API error: {result['errors']}")
            
            return result
        except requests.exceptions.RequestException as e:
            logging.error(f"Error making request to Monday.com: {e}")
            raise Exception(f"Failed to connect to Monday.com: {str(e)}")

    def get_boards(self) -> list:
        """Get all boards accessible to the user"""
        query = """
        query {
            boards {
                id
                name
                description
                state
            }
        }
        """
        
        result = self._make_request(query)
        return result.get("data", {}).get("boards", [])

    def get_board_groups(self, board_id: str) -> list:
        """Get groups (sections) in a board"""
        query = """
        query ($board_id: [Int!]) {
            boards(ids: $board_id) {
                groups {
                    id
                    title
                    color
                }
            }
        }
        """
        
        variables = {"board_id": [int(board_id)]}
        result = self._make_request(query, variables)
        boards = result.get("data", {}).get("boards", [])
        return boards[0].get("groups", []) if boards else []

    def create_task(self, task_name: str, group_id: Optional[str] = None) -> Dict[Any, Any]:
        """
        Create a new task/item in the enforced Monday.com board.
        Board ID is automatically enforced from environment variable.
        """
        query = """
        mutation ($board_id: ID!, $item_name: String!, $group_id: String) {
            create_item (
                board_id: $board_id,
                item_name: $item_name,
                group_id: $group_id
            ) {
                id
                name
                created_at
                url
            }
        }
        """
        
        # Always use the enforced board ID from environment
        variables = {
            "board_id": str(self.enforced_board_id),
            "item_name": task_name
        }
        
        if group_id:
            variables["group_id"] = group_id
        
        print(f"🔒 Creating task in enforced board {self.enforced_board_id}")
        print(f"🔍 Task: '{task_name}' in group: {group_id or 'default'}")
        
        try:
            result = self._make_request(query, variables)
            print(f"🔍 Monday.com API response: {result}")
            created_item = result.get("data", {}).get("create_item", {})
            print(f"✅ Created item: {created_item}")
            return created_item
        except Exception as e:
            print(f"❌ Error in create_task: {e}")
            raise

    def update_task_status(self, item_id: str, status_column_id: str, status_label: str) -> Dict[Any, Any]:
        """Update task status"""
        query = """
        mutation ($item_id: Int!, $column_id: String!, $value: JSON!) {
            change_column_value (
                item_id: $item_id,
                column_id: $column_id,
                value: $value
            ) {
                id
                name
            }
        }
        """
        
        variables = {
            "item_id": int(item_id),
            "column_id": status_column_id,
            "value": json.dumps({"label": status_label})
        }
        
        result = self._make_request(query, variables)
        return result.get("data", {}).get("change_column_value", {})

    def add_task_update(self, item_id: str, update_text: str) -> Dict[Any, Any]:
        """Add an update/comment to a task"""
        query = """
        mutation ($item_id: Int!, $body: String!) {
            create_update (
                item_id: $item_id,
                body: $body
            ) {
                id
                body
                created_at
            }
        }
        """
        
        variables = {
            "item_id": int(item_id),
            "body": update_text
        }
        
        result = self._make_request(query, variables)
        return result.get("data", {}).get("create_update", {})

    def search_tasks(self, search_term: str = "") -> list:
        """
        Search for tasks in the enforced Monday.com board.
        Board ID is automatically enforced from environment variable.
        """
        query = """
        query ($board_id: [Int!]) {
            boards(ids: $board_id) {
                items {
                    id
                    name
                    created_at
                    url
                    state
                    creator {
                        name
                    }
                    group {
                        title
                    }
                }
            }
        }
        """
        
        # Always use the enforced board ID from environment
        variables = {"board_id": [int(self.enforced_board_id)]}
        print(f"🔒 Searching tasks in enforced board {self.enforced_board_id}")
        
        result = self._make_request(query, variables)
        boards = result.get("data", {}).get("boards", [])
        
        if not boards:
            return []
        
        items = boards[0].get("items", [])
        
        # Filter items that contain the search term if provided
        if search_term:
            return [item for item in items if search_term.lower() in item.get("name", "").lower()]
        else:
            return items

def test_monday_connection():
    """Test Monday.com API connection"""
    try:
        client = MondayClient()
        boards = client.get_boards()
        print(f"✅ Connected to Monday.com! Found {len(boards)} boards.")
        return True
    except Exception as e:
        print(f"❌ Failed to connect to Monday.com: {e}")
        return False

if __name__ == "__main__":
    # Test the connection
    test_monday_connection()
