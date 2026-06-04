"""Linear API proxy routes for Work Daddy integration."""

from fastapi import APIRouter, HTTPException
import os
import httpx
import json

router = APIRouter(prefix="/api/linear", tags=["linear"])

LINEAR_KEY = os.getenv("LINEAR_API_KEY")
LINEAR_URL = "https://api.linear.app/graphql"

STATE_MAP = {
    "Backlog": "todo",
    "Todo": "todo",
    "In Progress": "in-progress",
    "In Review": "review",
    "Done": "done",
    "Cancelled": "done",
}

PRIORITY_MAP = {
    0: "Low",
    1: "Medium", 
    2: "High",
    3: "Urgent",
    4: "Critical",
}

async def linear_query(query: str, variables: dict = None):
    """Execute a GraphQL query against Linear API."""
    if not LINEAR_KEY:
        raise HTTPException(500, "Linear API key not configured")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LINEAR_URL,
            headers={
                "Authorization": LINEAR_KEY,
                "Content-Type": "application/json",
            },
            json={"query": query, "variables": variables or {}},
            timeout=30.0,
        )
        
        if resp.status_code != 200:
            raise HTTPException(502, f"Linear API error: {resp.status_code}")
        
        data = resp.json()
        if "errors" in data:
            raise HTTPException(502, f"Linear GraphQL error: {data['errors']}")
        
        return data["data"]


@router.get("/teams")
async def get_teams():
    """List available Linear teams."""
    query = """
    query Teams {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
    """
    return await linear_query(query)


@router.get("/issues")
async def get_issues(team: str = "TEA", limit: int = 50):
    """Get issues for a team, mapped to Kanban format."""
    query = """
    query Issues($filter: IssueFilter, $first: Int) {
      issues(filter: $filter, first: $first) {
        nodes {
          id
          identifier
          title
          description
          state { id name color type }
          priority
          assignee { id name avatarUrl }
          dueDate
          labels { nodes { id name color } }
          createdAt
          updatedAt
        }
      }
    }
    """
    
    variables = {
        "filter": {"team": {"key": {"eq": team}}},
        "first": limit,
    }
    
    data = await linear_query(query, variables)
    issues = data.get("issues", {}).get("nodes", [])
    
    # Transform to Kanban format
    kanban_issues = []
    for issue in issues:
        state_name = issue.get("state", {}).get("name", "Backlog")
        priority = issue.get("priority", 0)
        
        kanban_issues.append({
            "id": issue["identifier"],
            "linear_id": issue["id"],
            "title": issue["title"],
            "description": issue.get("description", ""),
            "column": STATE_MAP.get(state_name, "todo"),
            "state_name": state_name,
            "priority": PRIORITY_MAP.get(priority, "Low"),
            "priority_num": priority,
            "assignee": issue.get("assignee", {}).get("name") if issue.get("assignee") else None,
            "due_date": issue.get("dueDate"),
            "labels": [l["name"] for l in issue.get("labels", {}).get("nodes", [])],
            "created": issue.get("createdAt"),
            "updated": issue.get("updatedAt"),
        })
    
    return {"issues": kanban_issues, "count": len(kanban_issues)}


@router.post("/issues/{issue_id}/state")
async def update_issue_state(issue_id: str, state: str):
    """Update an issue's state (for drag-and-drop Kanban)."""
    # Map kanban column back to Linear state
    reverse_map = {
        "todo": "Backlog",
        "in-progress": "In Progress",
        "review": "In Review",
        "done": "Done",
    }
    
    linear_state = reverse_map.get(state, "Backlog")
    
    # First, find the state ID
    states_query = """
    query WorkflowStates {
      workflowStates {
        nodes {
          id
          name
        }
      }
    }
    """
    
    states_data = await linear_query(states_query)
    states = states_data.get("workflowStates", {}).get("nodes", [])
    
    state_id = None
    for s in states:
        if s["name"] == linear_state:
            state_id = s["id"]
            break
    
    if not state_id:
        raise HTTPException(400, f"Unknown state: {state}")
    
    # Update the issue
    mutation = """
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          state { name }
        }
      }
    }
    """
    
    variables = {
        "id": issue_id,
        "input": {"stateId": state_id},
    }
    
    return await linear_query(mutation, variables)
