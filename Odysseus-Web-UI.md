# Odysseus Web UI — Project Plan
**Project:** Work Daddy Web UI
**Date:** 2026-06-04
**Status:** Research complete → awaiting install approval

---

## Executive Summary

Odysseus is an open-source, self-hosted AI workspace (30K+ GitHub stars, launched May 31, 2026). It provides a web UI for chat, agents, calendar, tasks, documents, and research — exactly the features Kellen has been wanting for a visual dashboard.

**Decision:** Use Odysseus as the **web UI layer** on top of OpenClaw's existing gateway/memory/orchestration infrastructure. Do NOT replace OpenClaw — complement it.

---

## Why Odysseus?

1. **Has everything we want:** Chat, calendar, tasks, documents, research, memory, email
2. **Self-hosted:** Runs on Watchtower or VPS, privacy-first
3. **Theme system:** Easy to reskin — add a new theme in ~10 lines of JS
4. **Webhooks:** Can POST events to OpenClaw for integration
5. **Active:** 30K stars, PewDiePie's project, actively maintained
6. **PWA:** Works on mobile as installable app

## Why NOT Replace OpenClaw?

OpenClaw does things Odysseus cannot:
- Multi-channel routing (Telegram/Discord/Slack)
- Multi-agent orchestration (Chiron → Fabio, Hephaestus)
- Lossless-claw semantic memory with compaction
- Soul/identity system (SOUL.md, USER.md)
- Cron jobs with isolated sessions
- Skills framework (SKILL.md + clawhub)
- Group chat context and reply routing

**Integration strategy:** Odysseus = dashboard, OpenClaw = engine.

---

## Architecture

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

---

## Integration Points

### 1. Webhook Bridge (Easiest)
- Odysseus fires webhooks on: session.created, chat.completed, chat.message
- OpenClaw receives webhook → stores in memory, triggers other agents
- Bidirectional: OpenClaw can also call Odysseus API to inject messages

### 2. Shared Memory (Medium)
- Bridge Odysseus's ChromaDB to OpenClaw's lossless-claw
- Or: Use OpenClaw as the "brain" — Odysseus just displays state

### 3. Agent Delegation (Medium)
- Odysseus agent needs heavy work → webhook to OpenClaw
- OpenClaw spawns subagent → returns result
- Odysseus shows "delegated to Chiron" in UI

### 4. Persistent Tunnel URLs (Easy Add-on)
- Store persistent Cloudflare tunnel URLs in Odysseus SQLite
- Display in UI with copy-to-clipboard
- Tag by project/purpose

---

## Reskinning Plan

### Work Daddy Theme
```javascript
workdaddy: {
  bg: '#181816',        // Charcoal
  fg: '#F9EBDC',       // Cream
  panel: '#235E36',    // Dark green
  border: '#FAAFCC',   // Pink
  red: '#A8E10C',      // Lime (accent)
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

### Files to Modify
1. `static/js/theme.js` — Add Work Daddy theme to THEMES object
2. `static/index.html` — Update favicon SVG colors
3. `static/style.css` — CSS cleanup (admitted by author as needed)
4. Maybe: Add "gingham" background effect

---

## Risks

1. **Code quality concerns** — Author admits "I don't know what I'm doing"
   - Mitigation: Fork it, own it, refactor as needed
2. **Scope creep** — Does email, calendar, editor, image editor, etc.
   - Mitigation: Use only what we need, hide/disable the rest
3. **Memory architecture gap** — Simpler than lossless-claw
   - Mitigation: Bridge to OpenClaw or replace with our system
4. **Single-agent only** — No multi-agent orchestration
   - Mitigation: OpenClaw handles this; Odysseus is the UI

---

## Phases

### Phase 1: Install & Evaluate (Today)
- [ ] Run Odysseus in Docker on Watchtower
- [ ] Test voice transcription (whisper.cpp backend + browser mic)
- [ ] Test drag & drop file upload
- [ ] Wire Linear API to Task Board
- [ ] Verify theme system on mobile

### Phase 2: Reskin (This Week)
- [ ] Add Work Daddy theme
- [ ] Update favicon
- [ ] Mobile testing
- [ ] CSS cleanup pass

### Phase 3: Integration (Next)
- [ ] Build webhook receiver in OpenClaw
- [ ] Test bidirectional flow
- [ ] Document integration pattern
- [ ] Add persistent URL storage

### Phase 4: Production (Later)
- [ ] Deploy to VPS or Watchtower
- [ ] Reverse proxy (nginx/traefik)
- [ ] SSL/certificates
- [ ] User authentication

---

## Linear Issues

| Issue | Title | Status |
|-------|-------|--------|
| WD-59 | Evaluate Odysseus as web UI for OpenClaw | ✅ Research complete |
| WD-60 | Design Work Daddy theme for Odysseus | ✅ In progress |
| WD-61 | Build OpenClaw-Odysseus webhook bridge | Pending |
| WD-62 | Add persistent URL storage to Odysseus | Pending |
| WD-63 | Integrations page (API key management) | Future |
| WD-64 | Educational video library | Future |
| WD-65 | Cron job visualization | Future |
| WD-66 | Telegram thread sync to chat view | Future |
| WD-67 | Project management (Linear/native) | Future |
| WD-68 | Multi-agent dashboard | Future |
| WD-69 | Admin/orchestrator panel | Future |
| WD-71 | Voice transcription via whisper.cpp | In Progress |
| WD-72 | Parakeet ASR evaluation | Future |

---

---

## Feature Requests / Future Vision (2026-06-04)

## Voice Transcription Plan (2026-06-04)

### Two Modes

**Mode 1: Audio Record & Send** (browser microphone)
- Browser captures audio via `getUserMedia()` / `MediaRecorder` API
- WebSocket or chunked HTTP POST to backend for real-time or batched transcription
- Backend runs `whisper-cli` on received audio bytes
- Returns transcript to browser, displayed inline in chat or modal
- Supports: start/stop recording, live audio waveform visualization, cancel

**Mode 2: Drag & Drop / Upload** (files)
- Drag audio/video/image/document onto any Work Daddy widget or dedicated drop zone
- Backend accepts multipart/form-data upload
- Audio/video → whisper.cpp transcription
- Images → vision model (GPT-4o, etc.) for description/OCR
- Documents → text extraction (PyPDF, docx2txt)
- All outputs: transcript/extraction displayed in editable text area → save to Obsidian/Qdrant/Memory Browser

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Mic Button  │  │ Audio Viz   │  │ Drag & Drop Zone    │ │
│  │ (start/stop)│  │ (waveform)  │  │ (any file type)     │ │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘ │
│         │ WebSocket or HTTP POST                               │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  ODYSSEUS BACKEND (FastAPI)                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ POST /api/transcribe                                   │ │
│  │  - Accepts: multipart file OR WebSocket audio stream   │ │
│  │  - Saves to temp file (/tmp/whisper-in-XXXX.wav)       │ │
│  │  - Runs: whisper-cli -m ggml-base.en.bin -f in.wav   │ │
│  │  - Returns JSON: {text, segments[], language}          │ │
│  │                                                        │ │
│  │ POST /api/upload                                       │ │
│  │  - Accepts: multipart/form-data (any file)             │ │
│  │  - Routes by MIME type:                                │ │
│  │    audio/*, video/*  → whisper.cpp                    │ │
│  │    image/*           → vision model / OCR              │ │
│  │    application/pdf   → PyPDF extraction                │ │
│  │  - Returns JSON with extracted content                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Docker Changes:**
1. Add whisper.cpp build step to Dockerfile OR mount host whisper binary
2. Mount whisper models volume: `~/.openclaw/models:/app/whisper-models:ro`
3. Add ffmpeg for audio format conversion (MediaRecorder outputs webm/ogg, whisper wants wav)

**Backend Routes:**
- `POST /api/transcribe` — accepts audio blob, returns transcript
- `POST /api/upload` — accepts any file, routes to appropriate processor
- `GET /api/transcribe/models` — lists available whisper models

**Frontend Widget:**
- Floating modal (Odysseus pattern) or inline in chat composer
- Record button with hold-to-record or tap-to-start/stop
- Live audio waveform using Web Audio API + Canvas
- Playback of recorded audio before sending
- Cancel / Send / Retake buttons
- Transcript preview in editable textarea
- "Save to Memory" button → POST to Obsidian/Qdrant

**File Upload Zone:**
- Global drop zone (entire app) or per-widget
- Visual feedback on drag (border highlight, overlay)
- Progress bar for upload
- File type icons (audio, video, image, doc)
- Processing spinner with status text

**Security:**
- Max file size: 50MB (audio), 100MB (video)
- Rate limiting: 10 transcriptions per minute per user
- Temp files cleaned after processing
- Only logged-in users can access transcribe endpoints

**Models Strategy:**
- `ggml-base.en.bin` (147MB) — default, fast, good accuracy for clear speech
- `ggml-small.en.bin` — higher accuracy, slower, for noisy audio
- Auto-detect language option (use base model, not .en)
- Future: `ggml-medium.en.bin` if needed for Perri's reels

### Parakeet Evaluation (WD-72)
- Mozilla's fast local ASR — lighter than whisper.cpp
- Could run in browser via WASM (no backend needed)
- Trade-off: lower accuracy, especially with accents/background noise
- Test on Perri's actual reel audio before deciding
- If good enough: eliminates backend complexity entirely

### Integration Points
- **Chat widget**: mic button in composer bar → transcript inserted as message
- **Memory Browser**: "Transcribe Audio" button → results saved as new memory
- **Task Board**: attach transcription to task description
- **Obsidian**: auto-export transcript as new daily note or project note

### Files to Create/Modify
- `routes/transcribe_routes.py` — FastAPI endpoint
- `static/js/voice-recorder.js` — browser audio capture + waveform
- `static/js/file-upload.js` — drag & drop zone + upload handler
- `static/css/voice-recorder.css` — waveform + button styles
- `Dockerfile` — add ffmpeg, mount whisper models
- `docker-compose.yml` — add whisper-models volume mount
- `app.py` — register transcribe router
- `INTEGRATION-TRANSCRIBE.md` — documentation

### Priority Order
1. Backend `/api/transcribe` endpoint (30 min)
2. Frontend voice recorder widget (45 min)
3. Drag & drop file upload (30 min)
4. Docker compose updates for whisper models (15 min)
5. Parakeet evaluation — later (WD-72)

---

## Feature Requests / Future Vision (2026-06-04)

### Near-Term (This Week)
1. **🎙️ Voice Transcription** — Audio/Video to text in the browser
   - Upload audio/video files (reels, podcasts, meetings)
   - Local transcription via whisper.cpp (already running on Watchtower)
   - No data leaves the machine — privacy-first
   - Output: clean transcript with timestamps, speaker detection
   - Integration: send transcript to Memory Browser (Obsidian) or Qdrant for RAG
   - Perri's primary use case: reel-to-transcript workflow
   - Technical: whisper.cpp server mode or CLI via Node.js bridge
   - Alternative: Parakeet (Mozilla's fast ASR) if whisper is too slow

2. **🔑 Integrations Page** — API key management
   - Dedicated "Integrations" page in sidebar
   - Add API keys for OpenRouter, OpenAI, etc. — set-and-forget
   - Visual confirmation that keys are set (lock icon, green dot)
   - User never sees keys again after entry
   - Similar to Notion's integrations settings

2. **📚 Educational Video Library**
   - Page for Perri's course content / tutorials
   - Embedded videos (Vimeo/Bunny)
   - Progress tracking
   - Searchable by topic

### Medium-Term (This Month)
3. **📅 Cron Job Visualization**
   - See scheduled tasks/agents on calendar or dedicated "Schedules" view
   - Gantt-style timeline showing when things will run
   - Visual indicators for: pending, running, completed, failed
   - Integration with OpenClaw's cron system
   - Could live as a sub-view under Calendar or its own top-level item

4. **💬 Telegram Threads in Chats**
   - Forward/replicate Telegram conversations into Odysseus chat view
   - Select which chats to sync (group chats, DMs)
   - Bi-directional: reply in Odysseus → appears in Telegram
   - Thread-based view (not just flat chat)
   - Tag conversations by topic/agent

5. **✅ Project Management (Linear or Native)**
   - Option A: Pull from Linear (read-only sync)
   - Option B: Native task system (separate from Odysseus's basic tasks)
   - Task assignment to specific agents
   - Status tracking: Not Started → In Progress → Review → Done
   - Due dates, priorities, labels
   - Agent workload view (what's each agent working on)

### Long-Term (Post-V1)
6. **🤖 Multi-Agent Dashboard**
   - See all active agents in one view
   - Each agent card shows: current task, status, recent activity
   - Agent-to-agent handoff visualization
   - Chiron (orchestrator) view with decision graph
   - Agent chat rooms (agents can talk to each other, user observes)
   - Role-based access (admin, editor, viewer)

7. **🔧 Admin / Orchestrator Panel**
   - Configure agent behaviors, skills, triggers
   - See system health: memory usage, queue depth, model costs
   - Agent cost tracking per session
   - Kill/restart agents from UI
   - Skill marketplace (install new skills)
   - Model routing configuration (cheap vs premium models)

8. **📊 Analytics / Insights**
   - Agent usage stats (messages, tokens, cost)
   - Task completion rates
   - Calendar heatmap of agent activity
   - Response time trends
   - Perri's engagement metrics (if she's using it)

---

## References

- **Repo:** https://github.com/pewdiepie-archdaemon/odysseus
- **Research note:** `~/projects/odysseus-research/ODYSSEUS-RESEARCH-NOTE.md`
- **Design system:** `design-systems/work-daddy/`
- **Related project:** `projects/Work-Daddy-Architecture.md`

---

*Ready to proceed with Phase 1 upon Kellen's approval.*

