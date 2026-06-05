# Voice-to-Agent Workflow for Perri

## Overview

Perri can now speak to her agents (Chiron, Fabio, etc.) using voice transcription in the Work Daddy Web UI. The transcribed text goes directly into the chat composer, where she can edit it and send it.

## How It Works

### Option 1: Quick Voice Note (Chat Bar)
1. Perri clicks the 🎙️ mic button in the chat bar
2. Speaks her message
3. Transcription appears directly in the chat input
4. She reviews, edits if needed, hits Send

### Option 2: Full Transcription Widget (for longer recordings)
1. Perri clicks 🎙️ **Transcription** in the sidebar or rail
2. A floating modal opens
3. She clicks **Record** → speaks → clicks **Stop**
4. Backend transcribes the audio (1-2 seconds)
5. Transcript appears in the widget
6. She can:
   - **💬 Send to Chat** — inserts into chat composer
   - **✏️ Edit** — fix any transcription errors inline
   - **📋 Copy** — copy to clipboard for use elsewhere
   - Check **Auto-send** to skip the review step

## Backend

- **Endpoint:** `POST /api/transcribe/`
- **Engine:** faster-whisper (CTranslate2, local, fast)
- **Model:** `faster-whisper-base` (default)
- **Speed:** ~1-2 seconds for a 10-second voice message

## Files

| File | Purpose |
|------|---------|
| `static/js/transcription-widget.js` | Modal widget UI |
| `static/js/voiceRecorder.js` | Quick mic recording in chat bar |
| `routes/transcription_routes.py` | FastAPI endpoints |
| `services/transcription_service.py` | Whisper transcription logic |

## Global Helper

```javascript
// Any module can send text to chat:
window.sendTranscriptToChat("Hello agents, here's my voice message", autoSubmit=false)
```

## Access

- **URL:** `https://years-mpg-hotels-specifies.trycloudflare.com`
- **Login:** `admin` / `BIA5G8UbpDB7SDLvE9IXCdqv`
- **Route:** `/transcribe` or click 🎙️ in sidebar

## Next Improvements

1. **Direct audio streaming** — stream audio to backend while speaking (lower latency)
2. **Speaker diarization** — identify who spoke in multi-person recordings
3. **Voice commands** — "Hey Chiron, schedule a meeting" → agent parses and acts
4. **Transcript memory** — save transcripts to Obsidian for Perri's records
