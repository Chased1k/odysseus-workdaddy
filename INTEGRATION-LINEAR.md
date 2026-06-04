# Linear API Integration for Work Daddy Task Board

## Overview
Connect the Work Daddy Task Board to Linear for real project/issue data.

## Authentication
- API key stored in: `~/.openclaw/credentials/linear.json`
- Header: `Authorization: <api_key>` (no Bearer prefix)
- Endpoint: `https://api.linear.app/graphql`

## Implementation Options

### Option A: Direct Browser Calls (NOT RECOMMENDED - exposes API key)
Call Linear GraphQL directly from task-board.js. Requires exposing API key in frontend.

### Option B: Backend Proxy Route (RECOMMENDED)
Add a new route to Odysseus backend that proxies to Linear. Keeps API key secure.

### Option C: Environment Variable + Frontend
Pass Linear key to Odysseus container as env var, create simple backend endpoint.

## Recommended Implementation (Option C)

### 1. Add env var to docker-compose.yml
```yaml
services:
  odysseus:
    environment:
      - LINEAR_API_KEY=${LINEAR_API_KEY}
```

### 2. Create routes/linear_routes.py
```python
from fastapi import APIRouter, HTTPException
import os
import httpx

router = APIRouter(prefix="/api/linear", tags=["linear"])

LINEAR_KEY = os.getenv("LINEAR_API_KEY")
LINEAR_URL = "https://api.linear.app/graphql"

@router.get("/issues")
async def get_issues(team: str = "TEA"):
    if not LINEAR_KEY:
        raise HTTPException(500, "Linear API key not configured")
    
    query = """
    query Issues($filter: IssueFilter) {
      issues(filter: $filter) {
        nodes {
          id
          identifier
          title
          state { name color }
          priority
          assignee { name }
          dueDate
          labels { nodes { name } }
        }
      }
    }
    """
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LINEAR_URL,
            headers={"Authorization": LINEAR_KEY, "Content-Type": "application/json"},
            json={
                "query": query,
                "variables": {"filter": {"team": {"key": {"eq": team}}}}
            }
        )
        return resp.json()
```

### 3. Register in app.py
```python
from routes.linear_routes import router as linear_router
app.include_router(linear_router)
```

### 4. Update task-board.js
```javascript
// Fetch real Linear data
async function loadLinearIssues() {
  const resp = await fetch('/api/linear/issues?team=TEA');
  const data = await resp.json();
  
  // Map Linear states to Kanban columns
  // Backlog -> Todo
  // Todo -> Todo  
  // In Progress -> In Progress
  // In Review -> Review
  // Done -> Done
  // Cancelled -> Done
}
```

## State Mapping
| Linear State | Kanban Column |
|-------------|---------------|
| Backlog | Todo |
| Todo | Todo |
| In Progress | In Progress |
| In Review | Review |
| Done | Done |
| Cancelled | Done |

## Priority Mapping
| Linear Priority | Display |
|----------------|---------|
| 0 (No priority) | Low |
| 1 | Medium |
| 2 | High |
| 3 | Urgent |
| 4 | Critical |

## Team IDs
- Team Chase (TEA): `c689f506-f244-495e-8d8e-f0ac220aff76`
- Work Daddy (WD): `cf67bd85-56b1-4e41-a95e-41f01a1e6edc`

## Next Steps
1. Add Linear API key to workdaddy-dev .env
2. Create linear_routes.py
3. Register route in app.py
4. Update task-board.js to call /api/linear/issues
5. Map Linear issues to Kanban columns
6. Add drag-to-update-state functionality
