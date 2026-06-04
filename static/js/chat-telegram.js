/**
 * Telegram Chat Widget — floating modal with Telegram-style chat interface.
 * Follows Odysseus modal pattern (see tasks.js, agent-dashboard.js, task-board.js)
 *
 * Mock data ready for future Telegram Bot API integration.
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _escHandler = null;
let _activeThreadId = null;

// ---- Mock data (ready for real API integration) ----

const _mockThreads = [
  {
    id: 'perri',
    name: 'Perri Chase',
    handle: '@perri',
    avatar: 'P',
    avatarColor: '#FAAFCC',
    lastMessage: 'Can you check the SamCart stats before our call?',
    lastTime: '10:32 AM',
    unread: 2,
    messages: [
      { id: 1, sender: 'Perri Chase', self: false, text: 'Hey! Did you see the new Mighty Networks update?', time: '10:15 AM' },
      { id: 2, sender: 'You', self: true, text: 'Not yet — what changed?', time: '10:16 AM' },
      { id: 3, sender: 'Perri Chase', self: false, text: 'They added bulk member exports. Huge for our HubSpot sync.', time: '10:18 AM' },
      { id: 4, sender: 'You', self: true, text: 'That saves us a ton of Zapier calls. Nice.', time: '10:20 AM' },
      { id: 5, sender: 'Perri Chase', self: false, text: 'Can you check the SamCart stats before our call?', time: '10:32 AM' },
    ]
  },
  {
    id: 'kellen',
    name: 'Kellen',
    handle: '@kellen',
    avatar: 'K',
    avatarColor: '#A8E10C',
    lastMessage: 'The Perfect Cut deploy went through. Vercel green.',
    lastTime: '9:47 AM',
    unread: 0,
    messages: [
      { id: 1, sender: 'Kellen', self: false, text: 'Morning — pushed the Vercel config fix.', time: '9:30 AM' },
      { id: 2, sender: 'You', self: true, text: 'Saw the PR. LGTM.', time: '9:35 AM' },
      { id: 3, sender: 'Kellen', self: false, text: 'The Perfect Cut deploy went through. Vercel green.', time: '9:47 AM' },
    ]
  },
  {
    id: 'support',
    name: 'Support',
    handle: '@support_bot',
    avatar: 'S',
    avatarColor: '#B2EAEA',
    lastMessage: 'Unhandled exception in payments webhook. Stripe 402.',
    lastTime: 'Yesterday',
    unread: 1,
    messages: [
      { id: 1, sender: 'Support Bot', self: false, text: 'Unhandled exception in payments webhook. Stripe 402.', time: 'Yesterday' },
      { id: 2, sender: 'You', self: true, text: 'Looking into it now.', time: 'Yesterday' },
    ]
  },
  {
    id: 'teamchase',
    name: 'Team Chase',
    handle: 'Team Chase LLC',
    avatar: 'T',
    avatarColor: '#F9EBDC',
    lastMessage: 'Perri: Let’s move the Monday call to Tuesday.',
    lastTime: 'Tue',
    unread: 0,
    messages: [
      { id: 1, sender: 'Perri Chase', self: false, text: 'Let’s move the Monday call to Tuesday.', time: 'Tue' },
      { id: 2, sender: 'Kellen', self: false, text: 'Works for me.', time: 'Tue' },
    ]
  },
  {
    id: 'dev',
    name: 'Dev Channel',
    handle: '@dev_channel',
    avatar: 'D',
    avatarColor: '#A8E10C',
    lastMessage: 'CI passing on main again. Docker build fixed.',
    lastTime: 'Mon',
    unread: 0,
    messages: [
      { id: 1, sender: 'Dev Bot', self: false, text: 'CI passing on main again. Docker build fixed.', time: 'Mon' },
    ]
  }
];

// ---- Helpers ----

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _formatTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---- Render ----

function _renderThreadList() {
  const list = document.getElementById('chat-telegram-thread-list');
  if (!list) return;
  list.innerHTML = '';

  _mockThreads.forEach(thread => {
    const isActive = thread.id === _activeThreadId;
    const unreadDot = thread.unread > 0
      ? `<span class="chat-telegram-unread">${thread.unread}</span>`
      : '';

    const item = document.createElement('div');
    item.className = 'chat-telegram-thread' + (isActive ? ' active' : '');
    item.dataset.threadId = thread.id;
    item.innerHTML = `
      <div class="chat-telegram-thread-avatar" style="background:${thread.avatarColor}22;color:${thread.avatarColor};border-color:${thread.avatarColor}44;">
        ${_esc(thread.avatar)}
      </div>
      <div class="chat-telegram-thread-info">
        <div class="chat-telegram-thread-top">
          <span class="chat-telegram-thread-name">${_esc(thread.name)}</span>
          <span class="chat-telegram-thread-time">${_esc(thread.lastTime)}</span>
        </div>
        <div class="chat-telegram-thread-bottom">
          <span class="chat-telegram-thread-preview">${_esc(thread.lastMessage)}</span>
          ${unreadDot}
        </div>
      </div>
    `;
    item.addEventListener('click', () => _switchThread(thread.id));
    list.appendChild(item);
  });
}

function _renderMessages() {
  const body = document.getElementById('chat-telegram-message-area');
  const headerName = document.getElementById('chat-telegram-header-name');
  const headerStatus = document.getElementById('chat-telegram-header-status');
  if (!body) return;

  const thread = _mockThreads.find(t => t.id === _activeThreadId);
  if (!thread) {
    body.innerHTML = `
      <div class="chat-telegram-empty">
        <div style="font-size:40px;opacity:0.3;margin-bottom:12px;">💬</div>
        <div style="opacity:0.5;font-size:13px;">Select a conversation</div>
      </div>
    `;
    if (headerName) headerName.textContent = 'Telegram';
    if (headerStatus) headerStatus.textContent = '';
    return;
  }

  if (headerName) headerName.textContent = thread.name;
  if (headerStatus) headerStatus.textContent = thread.handle;

  body.innerHTML = '';
  let lastSender = null;

  thread.messages.forEach((msg, idx) => {
    const showName = !msg.self && msg.sender !== lastSender;
    const bubble = document.createElement('div');
    bubble.className = 'chat-telegram-bubble-row' + (msg.self ? ' self' : '');
    bubble.innerHTML = `
      <div class="chat-telegram-bubble">
        ${showName ? `<div class="chat-telegram-bubble-name">${_esc(msg.sender)}</div>` : ''}
        <div class="chat-telegram-bubble-text">${_esc(msg.text)}</div>
        <div class="chat-telegram-bubble-time">${msg.time}</div>
      </div>
    `;
    body.appendChild(bubble);
    lastSender = msg.sender;
  });

  // Scroll to bottom
  body.scrollTop = body.scrollHeight;
}

function _switchThread(threadId) {
  _activeThreadId = threadId;
  // Clear unread
  const thread = _mockThreads.find(t => t.id === threadId);
  if (thread) thread.unread = 0;
  _renderThreadList();
  _renderMessages();
}

function _sendMessage() {
  const input = document.getElementById('chat-telegram-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !_activeThreadId) return;

  const thread = _mockThreads.find(t => t.id === _activeThreadId);
  if (!thread) return;

  const msg = {
    id: Date.now(),
    sender: 'You',
    self: true,
    text,
    time: _formatTime()
  };
  thread.messages.push(msg);
  thread.lastMessage = text;
  thread.lastTime = 'now';
  input.value = '';
  _renderThreadList();
  _renderMessages();

  // TODO: wire to Telegram Bot API here
  // fetch(`${API_BASE}/api/telegram/send`, { ... })
}

// ---- Modal ----

export function openChatTelegram() {
  if (_open) return;
  _open = true;
  if (!_activeThreadId && _mockThreads.length) {
    _activeThreadId = _mockThreads[0].id;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'chat-telegram-modal';
  modal.innerHTML = `
    <div class="modal-content chat-telegram-modal-content">
      <div class="modal-header">
        <h4 style="position:relative;top:-2px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span id="chat-telegram-header-name">Telegram</span>
        </h4>
        <span id="chat-telegram-header-status" style="font-size:11px;opacity:0.5;margin-left:8px;flex:1;"></span>
        <button class="close-btn" id="chat-telegram-close">✖</button>
      </div>
      <div class="chat-telegram-body">
        <div class="chat-telegram-sidebar" id="chat-telegram-thread-list"></div>
        <div class="chat-telegram-main">
          <div class="chat-telegram-message-area" id="chat-telegram-message-area">
            <div class="chat-telegram-empty">
              <div style="font-size:40px;opacity:0.3;margin-bottom:12px;">💬</div>
              <div style="opacity:0.5;font-size:13px;">Select a conversation</div>
            </div>
          </div>
          <div class="chat-telegram-composer">
            <input type="text" id="chat-telegram-input" class="chat-telegram-input" placeholder="Message..." autocomplete="off" />
            <button class="chat-telegram-send" id="chat-telegram-send" title="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Draggable
  {
    const c = modal.querySelector('.modal-content');
    const h = modal.querySelector('.modal-header');
    if (c && h) makeWindowDraggable(modal, { content: c, header: h });
  }

  // Events
  document.getElementById('chat-telegram-close').addEventListener('click', closeChatTelegram);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeChatTelegram(); });

  _escHandler = (e) => { if (e.key === 'Escape') closeChatTelegram(); };
  document.addEventListener('keydown', _escHandler);

  // Send
  const sendBtn = document.getElementById('chat-telegram-send');
  const input = document.getElementById('chat-telegram-input');
  if (sendBtn) sendBtn.addEventListener('click', _sendMessage);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _sendMessage();
      }
    });
  }

  _renderThreadList();
  _renderMessages();
}

export function closeChatTelegram() {
  if (!_open) return;
  _open = false;
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  const modal = document.getElementById('chat-telegram-modal');
  if (modal) {
    const c = modal.querySelector('.modal-content');
    if (c) {
      c.classList.add('modal-closing');
      c.addEventListener('animationend', () => modal.remove(), { once: true });
      setTimeout(() => { if (modal.parentElement) modal.remove(); }, 250);
    } else {
      modal.remove();
    }
  }
}

export function isChatTelegramOpen() {
  return _open;
}

// Default export for legacy import patterns
const chatTelegramModule = { openChatTelegram, closeChatTelegram, isChatTelegramOpen };
export default chatTelegramModule;
