/**
 * Transcription Widget for Odysseus Work Daddy
 * 
 * Features:
 * - 🎙️ Browser audio recording (hold mic button)
 * - 📁 Drag & drop file upload for audio/video
 * - 🔄 Model selector: Whisper (default) + Parakeet placeholder
 * - 📝 Real-time transcription display
 * - 💾 Save to chat, clipboard, or Obsidian
 * - 🔇 Audio playback is OPTIONAL (not automatic)
 */

class TranscriptionWidget {
  constructor() {
    this.modal = null;
    this.recorder = null;
    this.isRecording = false;
    this.recordedBlob = null;
    this.currentModel = 'whisper-base-en';
    this.models = [];
    this.transcript = '';
    this.playbackEnabled = false; // Audio playback off by default
    this._init();
  }

  async _init() {
    await this._loadModels();
  }

  // ── Model Loading ──

  async _loadModels() {
    try {
      const res = await fetch('/api/transcribe/models', { credentials: 'same-origin' });
      const data = await res.json();
      this.models = data.models || [];
      
      // Set default
      if (data.default_model) {
        this.currentModel = data.default_model;
      }
    } catch (e) {
      console.warn('Failed to load transcription models:', e);
      // Fallback defaults
      this.models = [
        { id: 'whisper-base-en', name: 'Whisper Base English', provider: 'whisper.cpp', available: true, description: 'Fast, accurate, local' },
        { id: 'parakeet-tdt-0.6b', name: 'Parakeet TDT 0.6B', provider: 'parakeet', available: false, description: 'NVIDIA Parakeet — Apple Silicon only', disabled_reason: 'Requires Apple Silicon (MLX framework)' }
      ];
    }
  }

  // ── UI Rendering ──

  render(container) {
    container.innerHTML = `
      <div class="transcription-widget">
        <!-- Header -->
        <div class="transcription-header">
          <h3>🎙️ Voice Transcription</h3>
          <div class="transcription-controls">
            <select class="model-selector" title="Transcription Model">
              ${this.models.map(m => `
                <option value="${m.id}" ${m.available ? '' : 'disabled'} ${m.id === this.currentModel ? 'selected' : ''}>
                  ${m.available ? '' : '⛔ '}${m.name} ${m.available ? '✅' : '(unavailable)'}
                </option>
              `).join('')}
            </select>
            <button class="playback-toggle ${this.playbackEnabled ? 'active' : ''}" title="Toggle audio playback">
              🔊 Playback: ${this.playbackEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <!-- Recording Area -->
        <div class="recording-area">
          <button class="record-btn ${this.isRecording ? 'recording' : ''}">
            <span class="record-icon">🎙️</span>
            <span class="record-text">${this.isRecording ? 'Stop Recording' : 'Hold to Record'}</span>
            <span class="record-timer">00:00</span>
          </button>
          
          <div class="drop-zone">
            <span>📁 Drag & drop audio/video here</span>
            <span class="drop-hint">or click to browse</span>
            <input type="file" accept="audio/*,video/*" hidden>
          </div>
        </div>

        <!-- Status / Progress -->
        <div class="transcription-status hidden">
          <div class="spinner"></div>
          <span class="status-text">Transcribing...</span>
        </div>

        <!-- Results -->
        <div class="transcription-results hidden">
          <div class="result-header">
            <span class="result-model">🤖 ${this._getModelName(this.currentModel)}</span>
            <span class="result-stats"></span>
          </div>
          <textarea class="transcript-text" placeholder="Transcript will appear here..."></textarea>
          
          <!-- Optional Playback -->
          <div class="playback-area hidden">
            <audio controls class="playback-audio"></audio>
          </div>
          
          <div class="result-actions">
            <button class="btn-copy">📋 Copy</button>
            <button class="btn-send">💬 Send to Chat</button>
            <button class="btn-save">📝 Save to Obsidian</button>
            <button class="btn-clear">🗑️ Clear</button>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(container);
    this._applyStyles(container);
  }

  _applyStyles(container) {
    const style = document.createElement('style');
    style.textContent = `
      .transcription-widget {
        padding: 1rem;
        font-family: var(--font-ui, system-ui, sans-serif);
        color: var(--text-primary, #F9EBDC);
      }
      .transcription-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .transcription-header h3 {
        margin: 0;
        color: var(--wd-pink, #FAAFCC);
      }
      .transcription-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .model-selector {
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        border: 1px solid var(--wd-green, #235E36);
        background: var(--bg-panel, #181816);
        color: var(--text-primary, #F9EBDC);
        font-size: 0.85rem;
      }
      .model-selector option:disabled {
        color: #666;
        font-style: italic;
      }
      .playback-toggle {
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        border: 1px solid var(--wd-green, #235E36);
        background: var(--bg-panel, #181816);
        color: var(--text-secondary, #C0C0C0);
        cursor: pointer;
        font-size: 0.85rem;
      }
      .playback-toggle.active {
        background: var(--wd-green, #235E36);
        color: var(--wd-cream, #F9EBDC);
      }
      .recording-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .record-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem 2rem;
        border-radius: 50%;
        border: 3px solid var(--wd-green, #235E36);
        background: var(--bg-panel, #181816);
        color: var(--wd-cream, #F9EBDC);
        cursor: pointer;
        transition: all 0.2s;
        min-width: 120px;
        min-height: 120px;
      }
      .record-btn:hover {
        border-color: var(--wd-pink, #FAAFCC);
      }
      .record-btn.recording {
        border-color: var(--wd-pink, #FAAFCC);
        background: rgba(250, 175, 204, 0.1);
        animation: pulse-record 1.5s ease-in-out infinite;
      }
      @keyframes pulse-record {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .record-icon { font-size: 2rem; }
      .record-text { font-size: 0.85rem; }
      .record-timer { font-size: 1.1rem; font-weight: bold; color: var(--wd-lime, #A8E10C); }
      .drop-zone {
        width: 100%;
        padding: 2rem;
        border: 2px dashed var(--wd-green, #235E36);
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text-secondary, #C0C0C0);
      }
      .drop-zone:hover, .drop-zone.drag-over {
        border-color: var(--wd-pink, #FAAFCC);
        background: rgba(250, 175, 204, 0.05);
      }
      .drop-hint { display: block; font-size: 0.8rem; opacity: 0.6; margin-top: 0.3rem; }
      .transcription-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        color: var(--wd-lime, #A8E10C);
      }
      .transcription-status.hidden { display: none; }
      .spinner {
        width: 20px; height: 20px;
        border: 2px solid var(--wd-green, #235E36);
        border-top-color: var(--wd-lime, #A8E10C);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .transcription-results {
        border: 1px solid var(--wd-green, #235E36);
        border-radius: 8px;
        padding: 1rem;
        background: rgba(24, 24, 22, 0.5);
      }
      .transcription-results.hidden { display: none; }
      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-secondary, #C0C0C0);
      }
      .transcript-text {
        width: 100%;
        min-height: 120px;
        padding: 0.8rem;
        border: 1px solid var(--wd-green, #235E36);
        border-radius: 6px;
        background: var(--bg-panel, #181816);
        color: var(--text-primary, #F9EBDC);
        font-family: var(--font-mono, monospace);
        font-size: 0.95rem;
        line-height: 1.5;
        resize: vertical;
      }
      .playback-area { margin-top: 0.5rem; }
      .playback-area.hidden { display: none; }
      .playback-area audio { width: 100%; }
      .result-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        flex-wrap: wrap;
      }
      .result-actions button {
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        border: 1px solid var(--wd-green, #235E36);
        background: var(--bg-panel, #181816);
        color: var(--text-primary, #F9EBDC);
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
      }
      .result-actions button:hover {
        background: var(--wd-green, #235E36);
      }
    `;
    container.appendChild(style);
  }

  // ── Event Binding ──

  _bindEvents(container) {
    // Model selector
    const modelSelect = container.querySelector('.model-selector');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.currentModel = e.target.value;
      });
    }

    // Playback toggle
    const playbackBtn = container.querySelector('.playback-toggle');
    if (playbackBtn) {
      playbackBtn.addEventListener('click', () => {
        this.playbackEnabled = !this.playbackEnabled;
        playbackBtn.classList.toggle('active', this.playbackEnabled);
        playbackBtn.textContent = `🔊 Playback: ${this.playbackEnabled ? 'ON' : 'OFF'}`;
      });
    }

    // Record button
    const recordBtn = container.querySelector('.record-btn');
    if (recordBtn) {
      // Mouse/touch hold to record
      const startRecording = () => this._startRecording(container);
      const stopRecording = () => this._stopRecording(container);
      
      recordBtn.addEventListener('mousedown', startRecording);
      recordBtn.addEventListener('mouseup', stopRecording);
      recordBtn.addEventListener('mouseleave', () => {
        if (this.isRecording) stopRecording();
      });
      
      // Touch events
      recordBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
      recordBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });
    }

    // Drag & drop
    const dropZone = container.querySelector('.drop-zone');
    const fileInput = container.querySelector('.drop-zone input[type="file"]');
    
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });
      
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this._processFile(files[0], container);
        }
      });
      
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this._processFile(e.target.files[0], container);
        }
      });
    }

    // Result actions
    const copyBtn = container.querySelector('.btn-copy');
    const sendBtn = container.querySelector('.btn-send');
    const saveBtn = container.querySelector('.btn-save');
    const clearBtn = container.querySelector('.btn-clear');
    const transcriptArea = container.querySelector('.transcript-text');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (transcriptArea) {
          transcriptArea.select();
          document.execCommand('copy');
          this._showToast('Copied to clipboard!');
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const text = transcriptArea?.value || '';
        if (text && window.sendMessage) {
          window.sendMessage(text);
          this._showToast('Sent to chat');
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._saveToObsidian(transcriptArea?.value || '');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.transcript = '';
        if (transcriptArea) transcriptArea.value = '';
        container.querySelector('.transcription-results')?.classList.add('hidden');
        this.recordedBlob = null;
      });
    }
  }

  // ── Recording ──

  async _startRecording(container) {
    if (this.isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];
      
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      
      this.recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this._transcribeBlob(this.recordedBlob, container);
      };
      
      this.recorder.start();
      this.isRecording = true;
      this._updateRecordUI(container, true);
      this._startTimer(container);
      
    } catch (err) {
      console.error('Recording failed:', err);
      this._showToast('Microphone access denied or not available', 'error');
    }
  }

  _stopRecording(container) {
    if (!this.isRecording || !this.recorder) return;
    
    this.recorder.stop();
    this.isRecording = false;
    this._updateRecordUI(container, false);
    this._stopTimer(container);
  }

  _updateRecordUI(container, recording) {
    const btn = container.querySelector('.record-btn');
    const icon = container.querySelector('.record-icon');
    const text = container.querySelector('.record-text');
    
    if (btn) btn.classList.toggle('recording', recording);
    if (icon) icon.textContent = recording ? '🔴' : '🎙️';
    if (text) text.textContent = recording ? 'Recording...' : 'Hold to Record';
  }

  _startTimer(container) {
    const timer = container.querySelector('.record-timer');
    if (!timer) return;
    
    let seconds = 0;
    this._timerInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      timer.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  _stopTimer(container) {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    const timer = container.querySelector('.record-timer');
    if (timer) timer.textContent = '00:00';
  }

  // ── File Processing ──

  async _processFile(file, container) {
    this._showStatus(container, `Processing ${file.name}...`);
    await this._transcribeBlob(file, container);
  }

  // ── Transcription ──

  async _transcribeBlob(blob, container) {
    this._showStatus(container, 'Transcribing...');
    
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', this.currentModel);
      formData.append('playback', this.playbackEnabled.toString());
      
      const res = await fetch('/api/transcribe/', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.message || err.detail || 'Transcription failed');
      }
      
      const data = await res.json();
      this.transcript = data.text || '';
      
      this._showResults(container, data);
      
    } catch (e) {
      console.error('Transcription error:', e);
      this._showToast(`Transcription failed: ${e.message}`, 'error');
      this._hideStatus(container);
    }
  }

  _showStatus(container, text) {
    const status = container.querySelector('.transcription-status');
    const statusText = container.querySelector('.status-text');
    if (status) status.classList.remove('hidden');
    if (statusText) statusText.textContent = text;
    container.querySelector('.transcription-results')?.classList.add('hidden');
  }

  _hideStatus(container) {
    container.querySelector('.transcription-status')?.classList.add('hidden');
  }

  _showResults(container, data) {
    this._hideStatus(container);
    
    const results = container.querySelector('.transcription-results');
    const transcriptArea = container.querySelector('.transcript-text');
    const modelLabel = container.querySelector('.result-model');
    const statsLabel = container.querySelector('.result-stats');
    const playbackArea = container.querySelector('.playback-area');
    const audioPlayer = container.querySelector('.playback-audio');
    
    if (results) results.classList.remove('hidden');
    if (transcriptArea) transcriptArea.value = data.text || '';
    if (modelLabel) modelLabel.textContent = `🤖 ${this._getModelName(data.model)}`;
    if (statsLabel) statsLabel.textContent = `${data.word_count || 0} words · ${data.char_count || 0} chars`;
    
    // Audio playback is OPTIONAL
    if (this.playbackEnabled && data.playback_url) {
      if (playbackArea) playbackArea.classList.remove('hidden');
      if (audioPlayer) audioPlayer.src = data.playback_url;
    } else {
      if (playbackArea) playbackArea.classList.add('hidden');
    }
  }

  _getModelName(modelId) {
    const model = this.models.find(m => m.id === modelId);
    return model?.name || modelId;
  }

  // ── Actions ──

  _saveToObsidian(text) {
    // Will be implemented when Obsidian integration is ready
    this._showToast('Save to Obsidian — coming soon');
    console.log('Save to Obsidian:', text);
  }

  _showToast(message, type = 'info') {
    // Use Odysseus toast if available
    if (window.showToast) {
      window.showToast(message, type === 'error' ? 5000 : 3000);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// Export for module system
export default TranscriptionWidget;

// Also expose globally for Odysseus integration
window.TranscriptionWidget = TranscriptionWidget;
