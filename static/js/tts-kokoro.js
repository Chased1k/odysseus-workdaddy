// static/js/tts-kokoro.js — Kokoro-82M TTS Widget for Work Daddy Odysseus UI
// Browser-only: loads kokoro-js from CDN, runs ONNX Runtime WebGPU/WASM
// No backend required — all synthesis happens client-side
//
// TODO: Once kokoro-js is available on npm/jsdelivr, swap the CDN import
//       to a vendored copy in static/lib/ for offline/air-gapped use.

// ── CDN Import (kokoro-js + ONNX Runtime) ──
// Using esm.sh as a shim until kokoro-js lands on jsdelivr or unpkg reliably.
const KOKORO_CDN = 'https://esm.sh/kokoro-js@1.2.0';
const ONNX_CDN   = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.all.min.js';

let _kokoro = null;     // KokoroTTS instance
let _voices = [];       // Available voices
let _currentVoice = null;
let _currentAudio = null; // AudioBufferSourceNode
let _ttsCtx = null;     // AudioContext
let _ttsOpen = false;
let _ttsModal = null;

// ── Lazy-load ONNX Runtime (global `ort`) ──
async function _loadONNX() {
  if (window.ort) return window.ort;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = ONNX_CDN;
    s.onload = () => resolve(window.ort);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Lazy-load Kokoro TTS ──
async function _loadKokoro() {
  if (_kokoro) return _kokoro;
  try {
    const ort = await _loadONNX();
    // Dynamic import from CDN
    const mod = await import(/* webpackIgnore: true */ KOKORO_CDN);
    const { KokoroTTS } = mod;
    _kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
      dtype: 'q8',         // q8 = fast, fp32 = quality
      device: 'webgpu',    // 'webgpu' or 'wasm'
    });
    _voices = await _kokoro.list_voices();
    // Default: first English voice
    const enVoices = _voices.filter(v => v.lang?.startsWith('en'));
    _currentVoice = (enVoices[0] || _voices[0])?.id || 'af_bella';
    return _kokoro;
  } catch (err) {
    console.error('Kokoro load failed:', err);
    _showError('Failed to load Kokoro TTS. WebGPU may not be available. Try wasm fallback.');
    throw err;
  }
}

// ── Speak Text ──
export async function speak(text, voiceId) {
  if (!text) return;
  try {
    const tts = await _loadKokoro();
    const voice = voiceId || _currentVoice;
    const result = await tts.generate(text, { voice });
    // result.audio is Float32Array at 24000 Hz
    await _playAudio(result.audio, result.sample_rate || 24000);
  } catch (err) {
    console.error('TTS speak failed:', err);
    _showError('Speech synthesis failed: ' + err.message);
  }
}

// ── Play Audio Buffer ──
async function _playAudio(float32Array, sampleRate) {
  if (!_ttsCtx) _ttsCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = _ttsCtx;
  if (ctx.state === 'suspended') await ctx.resume();
  
  const buffer = ctx.createBuffer(1, float32Array.length, sampleRate);
  buffer.getChannelData(0).set(float32Array);
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  
  _currentAudio = source;
  return new Promise(resolve => {
    source.onended = () => { _currentAudio = null; resolve(); };
  });
}

export function stopSpeaking() {
  if (_currentAudio) {
    try { _currentAudio.stop(); } catch(e){}
    _currentAudio = null;
  }
}

// ── Download Synthesis as WAV ──
export async function downloadSpeech(text, voiceId, filename) {
  if (!text) return;
  try {
    const tts = await _loadKokoro();
    const result = await tts.generate(text, { voice: voiceId || _currentVoice });
    const wav = _float32ToWav(result.audio, result.sample_rate || 24000);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `workdaddy-tts-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('TTS download failed:', err);
    _showError('Download failed: ' + err.message);
  }
}

function _float32ToWav(float32Array, sampleRate) {
  const numChannels = 1;
  const numFrames = float32Array.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF header
  _writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  _writeString(view, 8, 'WAVE');
  // fmt chunk
  _writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  _writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Convert float32 to int16
  for (let i = 0; i < numFrames; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(44 + i * 2, s, true);
  }
  
  return buffer;
}

function _writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ── Get Last Assistant Message from Chat ──
export function getLastChatMessage() {
  const msgs = document.querySelectorAll('.message-text, .chat-message, .assistant-message');
  if (!msgs.length) return '';
  const last = msgs[msgs.length - 1];
  return last.textContent || '';
}

// ── UI Helpers ──
function _showError(msg) {
  const status = document.getElementById('tts-status');
  if (status) {
    status.textContent = msg;
    status.style.color = '#ff6b6b';
  }
}

function _clearError() {
  const status = document.getElementById('tts-status');
  if (status) {
    status.textContent = '';
    status.style.color = '';
  }
}

// ── Build Voice Selector ──
function _buildVoiceSelector() {
  const select = document.createElement('select');
  select.id = 'tts-voice';
  select.style.cssText = 'background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:13px;flex:1;';
  
  // Group by language
  const byLang = {};
  _voices.forEach(v => {
    const lang = v.lang || 'unknown';
    if (!byLang[lang]) byLang[lang] = [];
    byLang[lang].push(v);
  });
  
  Object.entries(byLang).forEach(([lang, voices]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = _langName(lang);
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name}${v.gender ? ' (' + v.gender + ')' : ''}`;
      if (v.id === _currentVoice) opt.selected = true;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
  
  select.addEventListener('change', (e) => {
    _currentVoice = e.target.value;
  });
  
  return select;
}

function _langName(code) {
  const names = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', pl: 'Polish', nl: 'Dutch',
    ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
    hi: 'Hindi', tr: 'Turkish', vi: 'Vietnamese', ar: 'Arabic'
  };
  return names[code] || code.toUpperCase();
}

// ── Update Modal Body ──
function _updateUI() {
  if (!_ttsModal) return;
  const body = _ttsModal.querySelector('.modal-body');
  if (!body) return;
  
  // Check if already built (avoid rebuilding)
  if (body.querySelector('#tts-text')) return;
  
  body.innerHTML = '';
  body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;';
  
  // Status
  const status = document.createElement('div');
  status.id = 'tts-status';
  status.style.cssText = 'font-size:11px;color:var(--text-secondary);min-height:16px;';
  if (_kokoro) {
    status.textContent = `✅ Kokoro loaded — ${_voices.length} voices available`;
  } else {
    status.textContent = '⏳ Loading Kokoro TTS engine...';
  }
  body.appendChild(status);
  
  // Voice selector row
  const voiceRow = document.createElement('div');
  voiceRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  voiceRow.innerHTML = '<label style="font-size:13px;font-weight:500;white-space:nowrap;">Voice:</label>';
  if (_voices.length) {
    voiceRow.appendChild(_buildVoiceSelector());
  } else {
    const loading = document.createElement('span');
    loading.textContent = 'Loading voices...';
    loading.style.cssText = 'font-size:12px;color:var(--text-secondary);';
    voiceRow.appendChild(loading);
  }
  body.appendChild(voiceRow);
  
  // Text input
  const textarea = document.createElement('textarea');
  textarea.id = 'tts-text';
  textarea.placeholder = 'Enter text to speak...';
  textarea.style.cssText = 'width:100%;min-height:120px;background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px;font-size:13px;resize:vertical;box-sizing:border-box;';
  body.appendChild(textarea);
  
  // Button row
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
  
  // Speak button
  const speakBtn = document.createElement('button');
  speakBtn.id = 'tts-speak-btn';
  speakBtn.textContent = '🔊 Speak';
  speakBtn.style.cssText = 'background:var(--accent);color:var(--bg);border:none;border-radius:4px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:500;flex:1;';
  speakBtn.onclick = () => {
    const text = document.getElementById('tts-text')?.value;
    if (text) speak(text);
  };
  btnRow.appendChild(speakBtn);
  
  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.id = 'tts-stop-btn';
  stopBtn.textContent = '⏹ Stop';
  stopBtn.style.cssText = 'background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px 16px;cursor:pointer;font-size:13px;';
  stopBtn.onclick = stopSpeaking;
  btnRow.appendChild(stopBtn);
  
  // Download button
  const dlBtn = document.createElement('button');
  dlBtn.id = 'tts-dl-btn';
  dlBtn.textContent = '⬇ Download';
  dlBtn.style.cssText = 'background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px 16px;cursor:pointer;font-size:13px;';
  dlBtn.onclick = () => {
    const text = document.getElementById('tts-text')?.value;
    if (text) downloadSpeech(text);
  };
  btnRow.appendChild(dlBtn);
  
  // From last chat button
  const lastBtn = document.createElement('button');
  lastBtn.id = 'tts-last-btn';
  lastBtn.textContent = '📝 From Last Chat';
  lastBtn.style.cssText = 'background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px 16px;cursor:pointer;font-size:13px;';
  lastBtn.onclick = () => {
    const lastMsg = getLastChatMessage();
    if (lastMsg) {
      const ta = document.getElementById('tts-text');
      if (ta) ta.value = lastMsg;
      speak(lastMsg);
    } else {
      _showError('No chat message found');
    }
  };
  btnRow.appendChild(lastBtn);
  
  body.appendChild(btnRow);
  
  // Populate voices if loaded
  if (_voices.length && !body.querySelector('#tts-voice')) {
    voiceRow.innerHTML = '<label style="font-size:13px;font-weight:500;white-space:nowrap;">Voice:</label>';
    voiceRow.appendChild(_buildVoiceSelector());
  }
}

// ── Modal Open/Close ──
export function isTTSOpen() { return _ttsOpen; }

export function openTTS() {
  if (_ttsOpen) return;
  _ttsOpen = true;
  
  // Init Kokoro in background
  _loadKokoro().then(() => {
    _updateUI();
  }).catch(() => {
    // Error already shown in _loadKokoro
  });
  
  const modal = document.createElement('div');
  modal.id = 'tts-modal';
  modal.className = 'app-modal';
  // Flag for modalManager integration
  modal.dataset.modalId = 'tts-modal';
  modal.style.cssText = 'position:fixed;top:80px;left:80px;width:480px;max-height:70vh;background:var(--bg,#0F0F0F);border:1px solid var(--border,#333);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:900;display:flex;flex-direction:column;overflow:hidden;';
  
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border,#333);">
      <span style="font-weight:600;font-size:13px;color:var(--text,#F9EBDC);">🔊 Text to Speech</span>
      <button id="tts-close-btn" style="background:transparent;border:none;color:var(--text);cursor:pointer;font-size:16px;padding:0 4px;">×</button>
    </div>
    <div class="modal-body" style="flex:1;overflow:auto;"></div>
  `;
  
  document.body.appendChild(modal);
  _ttsModal = modal;
  
  document.getElementById('tts-close-btn')?.addEventListener('click', closeTTS);
  
  _updateUI();
}

export function closeTTS() {
  if (!_ttsOpen || !_ttsModal) return;
  stopSpeaking();
  _ttsModal.remove();
  _ttsModal = null;
  _ttsOpen = false;
}

export function toggleTTS() {
  _ttsOpen ? closeTTS() : openTTS();
}
