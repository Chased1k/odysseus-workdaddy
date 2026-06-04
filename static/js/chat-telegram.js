/**
 * chat-telegram.js — Telegram chat interface for Odysseus (Work Daddy)
 *
 * Uses mock data for now. Replace MockAPI calls with real Telegram Bot API
 * (fetch to your backend or direct to api.telegram.org/bot<TOKEN>/...).
 *
 * Structure:
 *   - MockAPI:    mock data store + async methods matching TG Bot API shape
 *   - UI:         render thread list, message history, composer
 *   - State:      activeThreadId, drafts, search filter
 */

// ═════════════════════════════════════════════════════════════════════════════
// Mock API (replace with real fetch calls later)
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_USERS = {
  u1: { id: 'u1', first_name: 'Kellen', last_name: '', username: 'kellenpc', avatar: null },
  u2: { id: 'u2', first_name: 'Perri', last_name: 'Chase', username: 'perrichase', avatar: null },
  u3: { id: 'u3', first_name: 'Scarlet', last_name: '', username: null, avatar: null },
  u4: { id: 'u4', first_name: 'Team Chase', last_name: '', username: null, avatar: null },
  u5: { id: 'u5', first_name: 'Chiron', last_name: '', username: 'chiron_bot', avatar: null },
  u6: { id: 'u6', first_name: 'Joyce', last_name: 'Coulthard', username: null, avatar: null },
};

const MOCK_THREADS = [
  {
    id: 't1',
    type: 'private',
    title: 'Perri Chase',
    user_id: 'u2',
    unread: 2,
    last_message: { text: 'Can you check the SamCart numbers?', date: Date.now() / 1000 - 300 },
  },
  {
    id: 't2',
    type: 'group',
    title: 'Team Chase Ops',
    user_id: null,
    unread: 5,
    last_message: { text: 'Kellen: Perfect Cut deploy is live 🚀', date: Date.now() / 1000 - 1200 },
  },
  {
    id: 't3',
    type: 'private',
    title: 'Scarlet',
    user_id: 'u3',
    unread: 0,
    last_message: { text: 'Dad, can we work on Warrior Dog tonight?', date: Date.now() / 1000 - 7200 },
  },
  {
    id: 't4',
    type: 'private',
    title: 'Joyce',
    user_id: 'u6',
    unread: 1,
    last_message: { text: 'Flight confirmed PZQ11V for May 8', date: Date.now() / 1000 - 18000 },
  },
  {
    id: 't5',
    type: 'private',
    title: 'Chiron (bot)',
    user_id: 'u5',
    unread: 0,
    last_message: { text: 'Morning briefing ready.', date: Date.now() / 1000 - 86400 },
  },
];

const MOCK_MESSAGES = {
  t1: [
    { id: 101, from: 'u2', text: 'Hey — did the SamCart payouts hit yet?', date: Date.now() / 1000 - 3600, out: false },
    { id: 102, from: 'u1', text: 'Checking now. One sec.', date: Date.now() / 1000 - 3500, out: true },
    { id: 103, from: 'u2', text: 'Also need the Mighty Networks member count for the email.', date: Date.now() / 1000 - 3400, out: false },
    { id: 104, from: 'u1', text: 'Got it. 847 active as of this morning.', date: Date.now() / 1000 - 3300, out: true },
    { id: 105, from: 'u2', text: 'Can you check the SamCart numbers?', date: Date.now() / 1000 - 300, out: false },
  ],
  t2: [
    { id: 201, from: 'u1', text: 'New SamCart upsell is configured.', date: Date.now() / 1000 - 5000, out: true },
    { id: 202, from: 'u2', text: 'Great. What’s the take rate so far?', date: Date.now() / 1000 - 4800, out: false },
    { id: 203, from: 'u1', text: '12% on the first 200 checkouts.', date: Date.now() / 1000 - 4600, out: true },
    { id: 204, from: 'u4', text: 'Nice. Let’s keep it.', date: Date.now() / 1000 - 4500, out: false },
    { id: 205, from: 'u1', text: 'Perfect Cut deploy is live 🚀', date: Date.now() / 1000 - 1200, out: true },
  ],
  t3: [
    { id: 301, from: 'u3', text: 'I added the zombie sprite to the assets folder!', date: Date.now() / 1000 - 10000, out: false },
    { id: 302, from: 'u1', text: 'Saw it — looks sick. We’ll wire it up in level 2.', date: Date.now() / 1000 - 9900, out: true },
    { id: 303, from: 'u3', text: 'Dad, can we work on Warrior Dog tonight?', date: Date.now() / 1000 - 7200, out: false },
  ],
  t4: [
    { id: 401, from: 'u6', text: 'Geoffrey booked the flights.', date: Date.now() / 1000 - 20000, out: false },
    { id: 402, from: 'u1', text: 'Awesome. Forward me the confirmation?', date: Date.now() / 1000 - 19500, out: true },
    { id: 403, from: 'u6', text: 'Flight confirmed PZQ11V for May 8', date: Date.now() / 1000 - 18000, out: false },
  ],
  t5: [
    { id: 501, from: 'u5', text: 'Morning briefing ready.', date: Date.now() / 1000 - 86400, out: false },
    { id: 502, from: 'u1', text: 'Send it.', date: Date.now() / 1000 - 86000, out: true },
    { id: 503, from: 'u5', text: 'Briefing delivered to your Telegram.', date: Date.now() / 1000 - 85900, out: false },
  ],
};

const MockAPI = {
  async getUpdates() {
    // In real implementation: fetch('/api/telegram/updates') or polling to Bot API
    return { ok: true, result: [] };
  },
  async getThreads() {
    // In real implementation: fetch('/api/telegram/chats') or getUpdates-derived chat list
    return { ok: true, result: MOCK_THREADS };
  },
  async getMessages(chatId) {
    // In real implementation: fetch(`/api/telegram/messages?chat_id=${chatId}`)
    return { ok: true, result: MOCK_MESSAGES[chatId] || [] };
  },
  async sendMessage(chatId, text) {
    // In real implementation: POST /api/telegram/send or api.telegram.org/bot.../sendMessage
    const msg = {
      id: Date.now(),
      from: 'u1',
      text,
      date: Date.now() / 1000,
      out: true,
    };
    if (!MOCK_MESSAGES[chatId]) MOCK_MESSAGES[chatId] = [];
    MOCK_MESSAGES[chatId].push(msg);
    // Update last_message on thread
    const t = MOCK_THREADS.find((x) => x.id === chatId);
    if (t) t.last_message = { text, date: msg.date };
    return { ok: true, result: msg };
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// Utilities
// ═════════════════════════════════════════════════════════════════════════════

function fmtTime(unix) {
  const d = new Date(unix * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach((c) => e.appendChild(c));
  return e;
}

// ═════════════════════════════════════════════════════════════════════════════
// State
// ═════════════════════════════════════════════════════════════════════════════

const state = {
  threads: [],
  activeThreadId: null,
  messages: {},
  drafts: {},
  filter: '',
};

// ═════════════════════════════════════════════════════════════════════════════
// Render: Thread List
// ═════════════════════════════════════════════════════════════════════════════

function renderThreadList() {
  const container = document.getElementById('tg-thread-list');
  container.innerHTML = '';

  const term = state.filter.toLowerCase();
  const filtered = state.threads.filter((t) => t.title.toLowerCase().includes(term));

  if (filtered.length === 0) {
    container.appendChild(
      el('div', { className: 'tg-chat-empty', style: 'padding:24px 0;' }, [
        el('span', { text: 'No chats found.' }),
      ])
    );
    return;
  }

  filtered.forEach((t) => {
    const lastText = t.last_message?.text || '';
    const time = t.last_message?.date ? fmtTime(t.last_message.date) : '';
    const active = state.activeThreadId === t.id;

    const row = el('div', {
      className: `tg-thread${active ? ' active' : ''}`,
      role: 'listitem',
      onclick: () => selectThread(t.id),
    }, [
      el('div', { className: 'tg-thread-avatar' }, [
        el('span', { text: getInitials(t.title) }),
      ]),
      el('div', { className: 'tg-thread-body' }, [
        el('div', { className: 'tg-thread-top' }, [
          el('span', { className: 'tg-thread-name', text: t.title }),
          el('span', { className: 'tg-thread-time', text: time }),
        ]),
        el('div', { className: 'tg-thread-bottom' }, [
          el('span', { className: 'tg-thread-preview', text: lastText }),
          t.unread > 0 ? el('span', { className: 'tg-thread-badge', text: String(t.unread) }) : null,
          el('span', { className: 'tg-thread-type', text: t.type === 'group' ? 'group' : 'DM' }),
        ].filter(Boolean)),
      ]),
    ]);

    container.appendChild(row);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Render: Messages
// ═════════════════════════════════════════════════════════════════════════════

function renderMessages(threadId) {
  const history = document.getElementById('tg-chat-history');
  const empty = document.getElementById('tg-chat-empty');
  const header = document.getElementById('tg-chat-header');
  const composer = document.getElementById('tg-composer');
  const headerName = document.getElementById('tg-header-name');
  const headerSub = document.getElementById('tg-header-sub');
  const headerAvatar = document.getElementById('tg-header-avatar');

  if (!threadId) {
    history.style.display = 'none';
    empty.style.display = 'flex';
    header.style.display = 'none';
    composer.style.display = 'none';
    return;
  }

  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) return;

  empty.style.display = 'none';
  header.style.display = 'flex';
  composer.style.display = 'block';
  history.style.display = 'flex';

  headerName.textContent = thread.title;
  headerSub.textContent = thread.type === 'group' ? `${(state.messages[threadId] || []).length} messages` : 'Telegram';
  headerAvatar.innerHTML = `<span>${getInitials(thread.title)}</span>`;

  history.innerHTML = '';
  const msgs = state.messages[threadId] || [];
  if (msgs.length === 0) {
    history.appendChild(
      el('div', { className: 'tg-chat-empty' }, [
        el('span', { text: 'No messages yet.' }),
      ])
    );
    return;
  }

  let lastDate = null;
  msgs.forEach((m) => {
    const date = new Date(m.date * 1000).toDateString();
    if (date !== lastDate) {
      lastDate = date;
      history.appendChild(
        el('div', {
          className: 'tg-msg-date',
          style: 'align-self:center; font-size:11px; color:color-mix(in srgb, var(--fg) 45%, transparent); margin:6px 0; padding:2px 8px; border-radius:999px; background:color-mix(in srgb, var(--fg) 6%, transparent);',
          text: new Date(m.date * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        })
      );
    }

    const user = MOCK_USERS[m.from] || { first_name: 'Unknown' };
    const isOut = !!m.out;
    const cls = isOut ? 'tg-msg-out' : 'tg-msg-in';

    const meta = el('div', { className: 'tg-msg-meta' }, [
      el('span', { text: fmtTime(m.date) }),
    ]);

    if (isOut) {
      meta.appendChild(
        el('span', { className: 'tg-msg-status', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' })
      );
    }

    const bubble = el('div', { className: `tg-msg ${cls}` }, [
      thread.type === 'group' && !isOut
        ? el('div', { className: 'tg-msg-sender', text: user.first_name })
        : null,
      el('div', { className: 'tg-msg-text', html: escapeHtml(m.text).replace(/\n/g, '<br>') }),
      meta,
    ].filter(Boolean));

    history.appendChild(bubble);
  });

  // Scroll to bottom
  requestAnimationFrame(() => {
    history.scrollTop = history.scrollHeight;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Actions
// ═════════════════════════════════════════════════════════════════════════════

async function selectThread(id) {
  if (state.activeThreadId === id) return;
  state.activeThreadId = id;

  // Load messages if not cached
  if (!state.messages[id]) {
    const res = await MockAPI.getMessages(id);
    if (res.ok) state.messages[id] = res.result;
  }

  renderThreadList();
  renderMessages(id);

  // Restore draft
  const input = document.getElementById('tg-message-input');
  input.value = state.drafts[id] || '';
  autoResize(input);

  // On mobile, close sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('tg-sidebar').classList.remove('open');
    document.getElementById('tg-sidebar-backdrop').classList.remove('show');
  }
}

async function sendMessage() {
  const input = document.getElementById('tg-message-input');
  const text = input.value.trim();
  if (!text || !state.activeThreadId) return;

  const btn = document.getElementById('tg-send-btn');
  btn.disabled = true;

  // Optimistic insert
  const optimistic = {
    id: 'local-' + Date.now(),
    from: 'u1',
    text,
    date: Date.now() / 1000,
    out: true,
    pending: true,
  };
  if (!state.messages[state.activeThreadId]) state.messages[state.activeThreadId] = [];
  state.messages[state.activeThreadId].push(optimistic);
  renderMessages(state.activeThreadId);

  // Call API
  const res = await MockAPI.sendMessage(state.activeThreadId, text);

  // Replace optimistic with confirmed (or mark failed)
  const idx = state.messages[state.activeThreadId].findIndex((m) => m.id === optimistic.id);
  if (idx !== -1) {
    if (res.ok) {
      state.messages[state.activeThreadId][idx] = res.result;
    } else {
      state.messages[state.activeThreadId][idx].failed = true;
      state.messages[state.activeThreadId][idx].pending = false;
    }
  }

  // Clear draft + input
  state.drafts[state.activeThreadId] = '';
  input.value = '';
  autoResize(input);

  // Refresh thread list so last_message updates
  renderThreadList();
  renderMessages(state.activeThreadId);

  btn.disabled = false;
}

// ═════════════════════════════════════════════════════════════════════════════
// Composer
// ═════════════════════════════════════════════════════════════════════════════

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

function initComposer() {
  const input = document.getElementById('tg-message-input');
  const btn = document.getElementById('tg-send-btn');

  input.addEventListener('input', () => {
    autoResize(input);
    if (state.activeThreadId) {
      state.drafts[state.activeThreadId] = input.value;
    }
    btn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  btn.addEventListener('click', sendMessage);
}

// ═════════════════════════════════════════════════════════════════════════════
// Search
// ═════════════════════════════════════════════════════════════════════════════

function initSearch() {
  const s = document.getElementById('tg-search');
  s.addEventListener('input', (e) => {
    state.filter = e.target.value;
    renderThreadList();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Mobile menu
// ═════════════════════════════════════════════════════════════════════════════

function initMobile() {
  const menuBtn = document.getElementById('tg-menu-btn');
  const sidebar = document.getElementById('tg-sidebar');
  const backdrop = document.getElementById('tg-sidebar-backdrop');

  function open() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
  }
  function close() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  }

  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  backdrop.addEventListener('click', close);
}

// ═════════════════════════════════════════════════════════════════════════════
// Boot
// ═════════════════════════════════════════════════════════════════════════════

async function boot() {
  // Load threads
  const res = await MockAPI.getThreads();
  if (res.ok) {
    state.threads = res.result;
  }

  initSearch();
  initComposer();
  initMobile();
  renderThreadList();

  // Optional: pre-select first thread
  // if (state.threads[0]) selectThread(state.threads[0].id);
}

boot();

// ─────────────────────────────────────────────────────────────────────────────
// Real API migration helpers (commented — unwire MockAPI and use these)
// ─────────────────────────────────────────────────────────────────────────────

/*
async function fetchTelegram(method, params = {}) {
  const url = new URL(`/api/telegram/${method}`, location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { credentials: 'same-origin' });
  return r.json();
}

async function postTelegram(method, body = {}) {
  const r = await fetch(`/api/telegram/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  return r.json();
}

// Then replace:
//   MockAPI.getThreads()    → fetchTelegram('getChats')
//   MockAPI.getMessages(id) → fetchTelegram('getMessages', { chat_id: id })
//   MockAPI.sendMessage(...)→ postTelegram('sendMessage', { chat_id, text })
*/
