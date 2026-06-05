/**
 * Transcription Widget — floating modal for voice/audio transcription
 * Follows Odysseus modal pattern (see tasks.js)
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _transcript = '';
let _isRecording = false;
let _mediaRecorder = null;
let _audioChunks = [];
let _recordedBlob = null;
let _currentModel = 'faster-whisper-base';
let _models = [];
let _playbackEnabled = false;

// ── Model Loading ──

async function _loadModels() {
  try {
    const res = await fetch(`${API_BASE}/api/transcribe/models`, { credentials: 'same-origin' });
    const data = await res.json();
    _models = data.models || [];
    if (data.default_model) _currentModel = data.default_model;
  } catch (e) {
    console.warn('Failed to load models:', e);
    _models = [
      { id: 'faster-whisper-base', name: 'Faster Whisper Base', provider: 'faster-whisper', available: true, description: 'Fast, accurate, local' }
    ];
  }
}

// ── Recording ──

async function _startRecording() {
  if (!window.isSecureContext) {
    alert('Microphone requires HTTPS or localhost');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Microphone not supported in this browser');
    return;
  }

  _audioChunks = [];
  _recordedBlob = null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    _mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) _audioChunks.push(e.data);
    };

    _mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      _recordedBlob = new Blob(_audioChunks, { type: 'audio/webm' });
      _updateUI();
    };

    _mediaRecorder.start();
    _isRecording = true;
    _updateUI();
  } catch (e) {
    console.error('Recording error:', e);
    alert('Could not access microphone: ' + e.message);
  }
}

function _stopRecording() {
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
    _mediaRecorder.stop();
  }
  _isRecording = false;
  _updateUI();
}

// ── Transcription ──

async function _transcribe() {
  if (!_recordedBlob) return;

  const statusEl = document.getElementById('transcription-status');
  if (statusEl) statusEl.textContent = 'Transcribing...';

  const formData = new FormData();
  formData.append('file', _recordedBlob, 'recording.webm');
  formData.append('model', _currentModel);
  formData.append('playback', String(_playbackEnabled));

  try {
    const res = await fetch(`${API_BASE}/api/transcribe/`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
      throw new Error(err.detail || 'Transcription failed');
    }

    const data = await res.json();
    _transcript = data.text || '';
    if (statusEl) statusEl.textContent = `${data.word_count || 0} words`;
    _updateUI();
  } catch (e) {
    console.error('Transcription error:', e);
    if (statusEl) statusEl.textContent = 'Error: ' + e.message;
  }
}

// ── File Upload ──

function _handleFileUpload(file) {
  if (!file) return;
  _recordedBlob = file;
  _updateUI();
  _transcribe();
}

// ── UI ──

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _updateUI() {
  const body = document.getElementById('transcription-body');
  if (!body) return;

  const modelOptions = _models.map(m => {
    const disabled = !m.available ? 'disabled' : '';
    const label = m.disabled_reason ? ` (${m.disabled_reason})` : '';
    return `<option value="${_esc(m.id)}" ${m.id === _currentModel ? 'selected' : ''} ${disabled}>${_esc(m.name)}${label}</option>`;
  }).join('');

  const recordBtn = _isRecording
    ? `<button id="transcription-stop-btn" style="background:#ff4444;color:#fff;border:none;border-radius:6px;padding:10px 18px;cursor:pointer;font-size:13px;">⏹ Stop Recording</button>`
    : `<button id="transcription-record-btn" style="background:var(--accent,#A8E10C);color:#000;border:none;border-radius:6px;padding:10px 18px;cursor:pointer;font-size:13px;">🎙️ Record</button>`;

  const audioPreview = _recordedBlob
    ? `<audio controls src="${URL.createObjectURL(_recordedBlob)}" style="width:100%;margin:8px 0;"></audio>`
    : '';

  const transcriptSection = _transcript
    ? `<div style="background:var(--panel-bg,#1A1A1A);border:1px solid var(--border,#333);border-radius:6px;padding:12px;margin-top:10px;">
         <div style="font-size:11px;opacity:0.6;margin-bottom:6px;">TRANSCRIPT</div>
         <div id="transcription-text-display" style="font-size:13px;line-height:1.5;white-space:pre-wrap;">${_esc(_transcript)}</div>
         <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
           <button id="transcription-copy-btn" style="background:var(--accent,#A8E10C);color:#000;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;">📋 Copy</button>
           <button id="transcription-send-btn" style="background:#235E36;color:#F9EBDC;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;font-weight:600;">💬 Send to Chat</button>
           <button id="transcription-edit-btn" style="background:transparent;color:var(--text,#F9EBDC);border:1px solid var(--border,#333);border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;">✏️ Edit</button>
           <button id="transcription-clear-btn" style="background:transparent;color:var(--text,#F9EBDC);border:1px solid var(--border,#333);border-radius:4px;padding:6px 12px;cursor:pointer;font-size:11px;">Clear</button>
         </div>
       </div>`
    : '';

  body.innerHTML = `
    <div style="padding:12px;max-width:600px;">
      <!-- Controls -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        ${recordBtn}
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
          <input type="checkbox" id="transcription-playback-check" ${_playbackEnabled ? 'checked' : ''}>
          Playback
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
          <input type="checkbox" id="transcription-autosend-check">
          Auto-send
        </label>
        <select id="transcription-model-select" style="background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:6px;font-size:12px;">
          ${modelOptions}
        </select>
      </div>

      <!-- Drop zone -->
      <div id="transcription-dropzone" style="border:2px dashed var(--border,#444);border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color 0.2s;">
        <div style="font-size:24px;margin-bottom:8px;">📁</div>
        <div style="font-size:12px;opacity:0.7;">Drag & drop audio/video here<br>or click to browse</div>
        <input type="file" id="transcription-file-input" accept="audio/*,video/*" style="display:none;">
      </div>

      <!-- Status -->
      <div id="transcription-status" style="font-size:11px;opacity:0.6;margin-top:8px;text-align:center;"></div>

      <!-- Audio preview -->
      ${audioPreview}

      <!-- Transcript -->
      ${transcriptSection}
    </div>
  `;

  // Wire up event listeners
  const recordBtnEl = document.getElementById('transcription-record-btn');
  if (recordBtnEl) recordBtnEl.addEventListener('click', _startRecording);

  const stopBtnEl = document.getElementById('transcription-stop-btn');
  if (stopBtnEl) stopBtnEl.addEventListener('click', _stopRecording);

  const modelSelect = document.getElementById('transcription-model-select');
  if (modelSelect) modelSelect.addEventListener('change', (e) => { _currentModel = e.target.value; });

  const playbackCheck = document.getElementById('transcription-playback-check');
  if (playbackCheck) playbackCheck.addEventListener('change', (e) => { _playbackEnabled = e.target.checked; });

  const dropzone = document.getElementById('transcription-dropzone');
  const fileInput = document.getElementById('transcription-file-input');

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput?.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent,#A8E10C)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border,#444)'; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border,#444)';
      const file = e.dataTransfer.files[0];
      if (file) _handleFileUpload(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) _handleFileUpload(file);
    });
  }

  const sendBtn = document.getElementById('transcription-send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      if (!_transcript) return;
      // Insert into chat composer
      const msgInput = document.getElementById('message');
      if (msgInput) {
        msgInput.value = _transcript;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.focus();
        // Flash success
        sendBtn.textContent = '✅ Sent!';
        sendBtn.style.background = 'var(--accent,#A8E10C)';
        sendBtn.style.color = '#000';
        setTimeout(() => {
          sendBtn.textContent = '💬 Send to Chat';
          sendBtn.style.background = '#235E36';
          sendBtn.style.color = '#F9EBDC';
        }, 1500);
        // Optionally auto-submit after a short delay to let user review
        const autoSend = document.getElementById('transcription-autosend-check');
        if (autoSend?.checked) {
          setTimeout(() => {
            const form = msgInput.closest('form');
            if (form) {
              // Trigger Odysseus chat submission
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(submitEvent);
            }
          }, 500);
        }
      } else {
        alert('Chat composer not found. Open a chat session first.');
      }
    });
  }

  const editBtn = document.getElementById('transcription-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const display = document.getElementById('transcription-text-display');
      if (!display) return;
      // Replace display with textarea
      const currentText = display.textContent;
      display.innerHTML = `<textarea id="transcription-edit-area" style="width:100%;min-height:80px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px;font-size:13px;resize:vertical;" placeholder="Edit transcript...">${_esc(currentText)}</textarea>`;
      const textarea = document.getElementById('transcription-edit-area');
      if (textarea) {
        textarea.focus();
        textarea.addEventListener('blur', () => {
          _transcript = textarea.value;
          _updateUI();
        });
        editBtn.textContent = '✅ Editing...';
      }
    });
  }

  const copyBtn = document.getElementById('transcription-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(_transcript).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 1500);
      });
    });
  }

  const clearBtn = document.getElementById('transcription-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      _transcript = '';
      _recordedBlob = null;
      _updateUI();
    });
  }
}

// ── Modal Open/Close ──

export function isTranscriptionOpen() { return _open; }

export function openTranscription() {
  if (_open) return;
  _open = true;
  _loadModels();

  const modal = document.createElement('div');
  modal.id = 'transcription-modal';
  modal.className = 'app-modal';
  modal.style.cssText = 'position:fixed;top:60px;left:60px;width:540px;max-height:80vh;background:var(--bg,#0F0F0F);border:1px solid var(--border,#333);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:900;display:flex;flex-direction:column;overflow:hidden;';

  modal.innerHTML = `
    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--panel-bg,#1A1A1A);border-bottom:1px solid var(--border,#333);cursor:grab;">
      <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">🎙️</span> Voice Transcription
      </div>
      <div style="display:flex;gap:6px;">
        <button class="modal-minimize" style="background:transparent;border:none;color:var(--text,#F9EBDC);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;">−</button>
        <button class="modal-close" style="background:transparent;border:none;color:var(--text,#F9EBDC);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;">×</button>
      </div>
    </div>
    <div id="transcription-body" style="flex:1;overflow-y:auto;overflow-x:hidden;"></div>
  `;

  document.body.appendChild(modal);
  makeWindowDraggable(modal, modal.querySelector('.modal-header'));

  // Close
  modal.querySelector('.modal-close').addEventListener('click', closeTranscription);
  modal.querySelector('.modal-minimize').addEventListener('click', () => {
    modal.style.display = 'none';
    document.dispatchEvent(new CustomEvent('modal-minimized', { detail: { id: 'transcription' } }));
  });

  // ESC to close
  const escHandler = (e) => { if (e.key === 'Escape') closeTranscription(); };
  document.addEventListener('keydown', escHandler);
  modal._escHandler = escHandler;

  _updateUI();
}

export function closeTranscription() {
  if (!_open) return;
  _open = false;
  const modal = document.getElementById('transcription-modal');
  if (modal) {
    document.removeEventListener('keydown', modal._escHandler);
    modal.remove();
  }
}

export function toggleTranscription() {
  _open ? closeTranscription() : openTranscription();
}

// ── Global helper: send text directly to chat composer ──

/**
 * Insert text into the main chat composer and optionally submit it.
 * This is the bridge from voice → chat.
 *
 * @param {string} text — transcript to send
 * @param {boolean} autoSubmit — whether to auto-submit after inserting
 */
export function sendToChat(text, autoSubmit = false) {
  const msgInput = document.getElementById('message');
  if (!msgInput) {
    console.warn('[transcription] Chat composer (#message) not found');
    return false;
  }

  // Set value and trigger input event for UI updates
  msgInput.value = text;
  msgInput.dispatchEvent(new Event('input', { bubbles: true }));
  msgInput.focus();

  // Flash the input to show it received content
  msgInput.style.transition = 'box-shadow 0.3s';
  msgInput.style.boxShadow = '0 0 0 2px var(--accent,#A8E10C)';
  setTimeout(() => { msgInput.style.boxShadow = ''; }, 600);

  if (autoSubmit) {
    setTimeout(() => {
      const form = msgInput.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }, 300);
  }

  return true;
}

// Expose globally for other modules
window.sendTranscriptToChat = sendToChat;
