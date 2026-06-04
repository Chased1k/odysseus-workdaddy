# Odysseus Research Note
**Date:** 2026-06-04
**Researcher:** Chiron
**Status:** Initial exploration — architecture analysis + integration strategy

---

## What Odysseus Is

Self-hosted AI workspace — "the self-hosted version of ChatGPT/Claude UI." Built by PewDiePie (30K+ stars in 2 days). Local-first, privacy-first.

**Stack:**
- Backend: Python (FastAPI) + SQLite/ChromaDB
- Frontend: Vanilla JS + CSS (single-page app, no framework)
- Memory: ChromaDB vector store + SQLite for structured data
- Agent: Built on "opencode" framework with MCP support
- Deployment: Docker or native Python

**Key Features:**
1. Chat with any model (local or API)
2. Agent mode with tools (bash, web, files, memory, skills)
3. Cookbook — hardware-aware model discovery & serving
4. Deep Research — multi-step research with cited reports
5. Compare — blind model comparison
6. Documents — AI-assisted editor (markdown/HTML/CSV)
7. Memory/Skills — persistent agent memory via ChromaDB
8. Email — IMAP/SMTP with AI triage
9. Notes & Tasks — quick notes + todo + cron-style scheduled tasks
10. Calendar — CalDAV sync (Radicale/Nextcloud/Apple/Fastmail)
11. Web UI at localhost:7000
12. Mobile-friendly (PWA)
13. Theme system (14 presets + custom)
14. Outgoing webhooks

---

## Architecture Deep Dive

### Session Management
- `core/session_manager.py` — SessionManager class with SQLite backend
- Sessions have: id, name, url, model, rag flag, archived flag, headers, history, owner, is_important, message_count
- Lazy message hydration — only loads recent 100 sessions at boot, messages fetched on demand
- Messages stored as JSON arrays for multimodal content

### Memory System
- **Short-term:** `src/memory.py` — simple JSON file + Jaccard similarity keyword extraction
- **Long-term:** `src/memory_vector.py` — ChromaDB vector store with fastembed (ONNX) embeddings
- **Retrieval:** Vector + keyword hybrid (category, timestamp, session_id indexes)
- **vs OpenClaw:** Much simpler than lossless-claw. No conversation compaction, no semantic summaries, no DAG-based recall. Just raw vector search over extracted snippets.

### Agent System
- **Framework:** Built on "opencode" (agent loop with tool calling)
- **Loop:** `src/agent_loop.py` (147KB — very large file)
- **Tools:** bash, web, files, memory, skills, MCP servers
- **Schema:** JSON tool definitions passed to LLM
- **Max steps:** Configurable (null = unlimited)
- **vs OpenClaw:** Single-agent architecture. No multi-agent orchestration. No "subagent" concept. No skill system like OpenClaw's SKILL.md framework.

### Theme System
- `static/js/theme.js` — 14 built-in presets + unlimited custom themes
- Stored in localStorage (not server-side)
- CSS custom properties: `--bg`, `--fg`, `--panel`, `--border`, `--red`
- Advanced: brand color, send button colors, bubble colors, input bg
- Background effects: none, dots, rain, synapse, embers, petals, constellations, perlin-flow, sparkles
- Easy to add new themes — just add entry to THEMES object

### Webhook System
- `src/webhook_manager.py` — Outgoing HTTP POSTs on events
- Events: session.created, chat.completed, chat.message, webhook.test
- HMAC-signed payloads
- Private IP blocking (security)
- **This is the integration point** — Odysseus could POST to OpenClaw gateway

### Database Schema
- SQLite via SQLAlchemy
- Tables: sessions, chat_messages, documents, scheduled_tasks, task_runs, memories, notes, email_accounts, contacts, calendar_events, mcp_servers, webhooks, users, editor_drafts, crew_members, settings, api_tokens, backups
- Encryption at rest via Fernet (EncryptedText column type)

---

## Integration Strategy: Odysseus + OpenClaw

### The Core Question
Does Odysseus replace OpenClaw, or complement it?

**Answer: Complement. Odysseus is the web UI layer; OpenClaw is the gateway/memory/orchestration layer.**

### What OpenClaw Does Better
1. **Gateway layer** — Telegram/Discord/Slack routing, heartbeat polling, session management across channels
2. **Soul/identity system** — SOUL.md, USER.md, AGENTS.md, MEMORY.md architecture
3. **Lossless-claw** — Semantic memory with conversation compaction, DAG-based recall, summary health
4. **Multi-agent orchestration** — Chiron → Fabio, Hephaestus, etc. with sessions_spawn
5. **Plugin ecosystem** — browser, whisper, active-memory, etc.
6. **Cron jobs** — OpenClaw's cron system with isolated sessions
7. **Skills framework** — SKILL.md with clawhub distribution
8. **Group chat context** — Thread-bound sessions, reply routing

### What Odysseus Does Better
1. **Web UI** — Visual dashboard for tasks, calendars, agents (OpenClaw has no web UI)
2. **Local model serving** — Cookbook hardware-aware model management
3. **Document editor** — Multi-tab editor with AI assistance
4. **Deep research** — Multi-step research workflows with visual reports
5. **Email integration** — IMAP/SMTP with AI triage (though we have AgentMail)
6. **Calendar/task UI** — Visual CalDAV scheduling
7. **Theme system** — Already exists, easy to reskin
8. **PWA** — Installable mobile app experience

### Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER FACING LAYER                      │
├─────────────────────────────────────────────────────────┤
│  Telegram │ Discord │ Slack │  ┌─────────────────────┐  │
│  (OpenClaw channels)          │  Odysseus Web UI    │  │
│                               │  (localhost:7000)   │  │
│                               │  - Chat             │  │
│                               │  - Calendar         │  │
│                               │  - Tasks            │  │
│                               │  - Documents        │  │
│                               │  - Deep Research    │  │
│                               └─────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│              OPENCLAW GATEWAY LAYER                     │
│  - Session management                                   │
│  - Channel routing                                      │
│  - Heartbeat / cron                                     │
│  - Multi-agent orchestration                            │
│  - Lossless-claw memory                                 │
│  - Soul/identity system                                 │
├─────────────────────────────────────────────────────────┤
│              SHARED SERVICES                            │
│  - SQLite/ChromaDB (could be shared or separate)        │
│  - Model endpoints (Ollama, vLLM, etc.)                │
│  - MCP servers                                          │
│  - File system / workspace                              │
└─────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Webhook bridge** (Easiest)
   - Odysseus webhooks → OpenClaw gateway events
   - When chat.completed fires in Odysseus → POST to OpenClaw
   - OpenClaw can process, store in memory, trigger other agents

2. **Shared memory** (Medium)
   - Bridge Odysseus's ChromaDB memory to OpenClaw's lossless-claw
   - Or: OpenClaw writes to Odysseus's SQLite DB
   - Or: Shared ChromaDB collection

3. **Agent delegation** (Medium)
   - Odysseus agent needs heavy work → webhook to OpenClaw
   - OpenClaw spawns subagent → returns result to Odysseus
   - Odysseus shows "delegated to Chiron" in UI

4. **Unified session** (Harder)
   - Single session ID across both systems
   - Messages sync bidirectionally
   - Complex but doable via webhook + API bridge

5. **URL tunneling** (Easy add-on)
   - Odysseus has webhook system already
   - Add persistent tunnel URL storage as a "service"
   - Store in SQLite, display in UI, copy-to-clipboard
   - Could be a custom module or even just a notes page

---

## Reskinning to Work Daddy Aesthetic

### Current Theme System
- File: `static/js/theme.js`
- 14 presets in THEMES object
- Easy to add new: just add key-value to THEMES

### Work Daddy Theme Definition
```javascript
workdaddy: {
  bg: '#181816',        // Charcoal (dark bg)
  fg: '#F9EBDC',       // Cream (text)
  panel: '#235E36',    // Dark green (panels)
  border: '#FAAFCC',   // Pink (borders/accent)
  red: '#A8E10C',      // Lime (highlights)
  advanced: {
    brandColor: '#FAAFCC',
    sendBtnBg: '#235E36',
    sendBtnHover: '#1a4527',
    userBubbleBg: '#235E36',
    aiBubbleBg: '#1a1a1a',
    inputBg: '#2a2a28'
  }
}
```

### CSS Custom Properties to Override
- `--bg` → charcoal
- `--fg` → cream
- `--panel` → dark green
- `--border` → pink
- `--red` → lime (used for accent/actions)
- `--brand-color` → pink

### What Else to Reskin
- Favicon SVG (currently hardcoded red)
- Loading screen ASCII art color
- Syntax highlighting (derived from theme in JS)
- Background effects (could add "gingham" pattern)
- Mobile theme-color meta tag

---

## Persistent Tunnel URLs Feature

### How to Add
1. New SQLite table: `persistent_urls`
   - id, name, url, description, created_at, updated_at, owner
2. New routes: `routes/persistent_url_routes.py`
   - CRUD endpoints
3. New UI section in notes/tasks area or new "Links" section
4. Copy-to-clipboard button
5. Integration with existing webhook system for notifications

### Alternative: Just Use Notes
- Odysseus already has notes with reminders
- Could store URLs as notes with tags
- Less work, less structured

---

## Risks & Concerns

1. **Code quality** — ROADMAP admits "I don't know what I'm doing, help"
   - CSS described as "Calypso's island"
   - Agent loop is 147KB single file
   - But: actively maintained, 30K stars, PewDiePie's project

2. **Scope creep** — It does A LOT
   - Email, calendar, research, editor, image editor, etc.
   - We may only need 3-4 features
   - Could fork and strip down

3. **Memory architecture** — Much simpler than lossless-claw
   - May need to bridge or replace
   - ChromaDB vs Qdrant (we use Qdrant for MLB RAG)

4. **Agent architecture** — Single-agent only
   - No multi-agent orchestration
   - No subagent spawning
   - OpenClaw would handle this layer

5. **Deployment** — Docker or native Python
   - Could run alongside OpenClaw on Watchtower
   - Or in separate Docker container
   - Port conflict: 7000 (needs to avoid OpenClaw's ports)

---

## Recommendations

### Phase 1: Install & Evaluate (Today)
1. Run Odysseus locally in Docker
2. Test chat, calendar, tasks, documents
3. Verify theme system works
4. Test webhook firing to a test endpoint

### Phase 2: Reskin (This Week)
1. Add Work Daddy theme to theme.js
2. Update favicon SVG colors
3. Test on mobile (PWA)
4. Adjust syntax highlighting if needed

### Phase 3: Integration Bridge (Next)
1. Build webhook receiver in OpenClaw
2. Test bidirectional event flow
3. Evaluate shared memory approach
4. Document integration pattern

### Phase 4: Persistent URLs (When Needed)
1. Add persistent_urls table
2. Build simple CRUD UI
3. Integrate with tunnel creation workflow

---

## Linear Issues to Create
- **WD-XX:** Evaluate Odysseus as web UI for OpenClaw
- **WD-XX:** Design Work Daddy theme for Odysseus
- **WD-XX:** Build OpenClaw-Odysseus webhook bridge
- **WD-XX:** Add persistent URL storage to Odysseus
- **WD-XX:** Fork/reskin Odysseus for Work Daddy aesthetic

---

## Related Files
- `~/projects/odysseus-research/` — Cloned repo
- `design-systems/work-daddy/` — Work Daddy design tokens
- `skills/showit/SKILL.md` — SI-BUTTON patterns (for UI component ideas)
- `projects/Work-Daddy-Architecture.md` — Multi-agent architecture

---

*Next step: Get Kellen's go-ahead to install and run it locally.*
