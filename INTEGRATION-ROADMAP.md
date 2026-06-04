# Work Daddy Frontend — Integration Roadmap

Each of the 5 custom pages built in the Odysseus skin needs real data to be useful. Here's what each page needs and how to wire it up.

---

## 1. Agent Dashboard (`/static/agent-dashboard.html`)

**What it shows now:** 3 mock agent cards (Chiron, Fabio, Hermes) with fake status, model usage, uptime, activity graphs.

**What it needs for real:**
- **Agent status:** Online/busy/offline for each OpenClaw agent
- **Model usage:** Which model each agent is currently using, token counts
- **Uptime:** How long each agent has been running
- **Recent actions:** Last N tasks completed by each agent

**How to get the data:**
- **Option A (OpenClaw bridge):** Build a small REST bridge that reads from OpenClaw's internal state (session logs, cron state) and exposes `/api/agents/status`
- **Option B (Direct from DB/file):** Read from OpenClaw's SQLite or JSON state files on disk (if accessible from the Odysseus container via shared volume)
- **Option C (Telegram Bot API):** Each agent reports its status to a shared Telegram channel or bot, dashboard polls that

**Files to touch:**
- `static/js/agent-dashboard.js` — replace `_mockAgents()` with `fetchAgents()`
- Add `/api/agents` endpoint to Odysseus backend (or bridge)

**Priority:** HIGH — this is the "who's working and on what" view

---

## 2. Task Board (`/static/task-board.html`)

**What it shows now:** Kanban with 4 columns and 8 mock tasks with Linear-style IDs.

**What it needs for real:**
- **Task data from Linear:** Real issues from the Team Chase + Work Daddy Linear projects
- **Status sync:** When a task is moved to "Done" in the UI, update Linear status
- **Agent assignment:** Which agent is working on which task
- **Due dates, priorities, descriptions**

**How to get the data:**
- **Linear API:** Already have the skill and API key. Call `api.linear.app/graphql` directly from the Odysseus backend.
  - Query: `issues(filter: { team: { id: { eq: "TEA" } } })`
  - Mutation: `issueUpdate(id: "TEA-42", input: { stateId: "done-state-id" })`
- **Webhook sync:** Linear webhooks push updates to Odysseus when issues change

**Files to touch:**
- `static/js/task-board.js` — replace `MockAPI` with `LinearAPI`
- Add `/api/linear/issues` and `/api/linear/update` endpoints

**Priority:** HIGH — this is the primary project management view

---

## 3. Agent Calendar (`/static/calendar.html`)

**What it shows now:** Month/week/day views with ~30 mock events color-coded by agent.

**What it needs for real:**
- **Cron jobs:** When each agent's scheduled tasks run (from OpenClaw cron)
- **Execution windows:** When tasks actually ran vs. when they were scheduled
- **Agent availability:** When agents are idle vs. busy
- **Optional:** Personal Google Calendar overlay (toggle)

**How to get the data:**
- **OpenClaw cron state:** Read `~/.openclaw/cron.json` or the cron DB via bridge
- **OpenClaw session logs:** Parse timestamps from session transcripts
- **Google Calendar API:** For personal calendar overlay (already have OAuth)
- **iCal feed:** OpenClaw could expose an ICS feed of agent schedules

**Files to touch:**
- `static/js/calendar-agent.js` — replace `_mockEvents()` with `_fetchSchedule()`
- Add `/api/agent-schedule` endpoint

**Priority:** MEDIUM — useful for understanding agent workload patterns

---

## 4. Chat/Telegram (`/static/chat-interface.html`)

**What it shows now:** 5 mock Telegram threads with fake messages.

**What it needs for real:**
- **Live Telegram messages:** Read from actual Telegram chats
- **Send messages:** Reply from the web UI back to Telegram
- **Thread list:** All chats the bot is in
- **Unread badges, last message preview**

**How to get the data:**
- **Telegram Bot API:** Use the bot token already configured for OpenClaw
  - `getUpdates` with long-polling or webhook
  - `sendMessage` to reply
  - `getChat` for thread metadata
- **Webhook approach:** Set a webhook on the bot pointing to Odysseus backend
  - `https://odysseus-backend/webhook/telegram`
- **Polling approach:** Backend polls `getUpdates` every few seconds

**Files to touch:**
- `static/js/chat-telegram.js` — uncomment the `fetchTelegram`/`postTelegram` stubs
- Add Telegram Bot API proxy endpoints (`/api/telegram/*`)
- Configure webhook or polling loop

**Priority:** MEDIUM — useful for monitoring conversations without opening Telegram app

---

## 5. Memory Browser (`/static/memory-browser.html`)

**What it shows now:** Search bar with mock results from Obsidian, Qdrant, and session logs.

**What it needs for real:**
- **Obsidian vault search:** Full-text search across markdown files
- **Qdrant RAG queries:** Semantic search across vector collections
- **Session log search:** Search across past OpenClaw session transcripts
- **Relevance scoring, highlighting, filtering**

**How to get the data:**
- **Obsidian:** Read from `~/workspace/obsidian/` via filesystem or simple file server
  - Can index with ripgrep or a simple Python script
- **Qdrant:** Direct API calls to `localhost:6333` (or wherever Qdrant runs)
  - Search: `POST /collections/{name}/points/search`
- **Session logs:** Read from `~/.openclaw/sessions/` or log directory
  - Parse JSON transcripts, index with simple search

**Files to touch:**
- `static/js/memory-browser.js` — replace mock data with real API calls
- Add endpoints: `/api/memory/obsidian`, `/api/memory/qdrant`, `/api/memory/sessions`

**Priority:** LOW-MEDIUM — nice to have, but not blocking daily ops

---

## Cross-Cutting Concerns

### Authentication
- All custom API endpoints need to verify the Odysseus session cookie
- Or use a shared API key/token between frontend and backend

### Real-time Updates
- **Polling:** Simple, works everywhere, but adds load
- **WebSocket:** Better for live chat, agent status, calendar updates
- **SSE (Server-Sent Events):** Good for one-way push (new messages, task updates)

### Data Freshness
- Agent status: every 30 seconds
- Task board: every 60 seconds or webhook-driven
- Calendar: on view change + every 5 minutes
- Chat: real-time (WebSocket or long-polling)
- Memory: on search only (no polling needed)

### Backend Architecture Options

**Option 1: Extend Odysseus FastAPI backend**
- Add new router modules in `src/routers/`
- Each page gets its own API module
- Pro: Single backend, unified auth
- Con: More Python code to maintain, upstream merge conflicts

**Option 2: Separate bridge service**
- Small FastAPI/Flask app running alongside Odysseus
- Proxies to Linear, Telegram, Qdrant, reads OpenClaw files
- Pro: Decoupled from Odysseus, easier to update independently
- Con: Another service to manage

**Option 3: File-based sync**
- OpenClaw writes state files to a shared volume
- Odysseus reads those files directly
- Pro: No API needed, simple
- Con: Not real-time, race conditions possible

**Recommended:** Option 2 (separate bridge) for flexibility, with Option 3 as fallback for simple data.

---

## Quick Wins (Do These First)

1. **Task Board + Linear:** Already have the API key and skill. FastAPI bridge can make GraphQL calls. 2-3 hours of work.
2. **Agent Dashboard (file-based):** Read OpenClaw's `~/.openclaw/sessions/` and `cron.json` directly. 1-2 hours.
3. **Memory Browser (Obsidian):** Simple directory listing + ripgrep. 1 hour.

---

## Files Created

- `static/agent-dashboard.html` + `js/agent-dashboard.js`
- `static/task-board.html` + `js/task-board.js`
- `static/calendar.html` + `js/calendar-agent.js`
- `static/chat-interface.html` + `js/chat-telegram.js`
- `static/memory-browser.html` + `js/memory-browser.js`
- Modified: `static/index.html` (nav sidebar), `static/app.js` (click handlers)

---

*Next step: Pick one page to wire up first (recommend Task Board or Agent Dashboard).*
