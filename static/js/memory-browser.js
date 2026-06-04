/**
 * Memory Browser — floating modal for cross-source memory search
 * Follows Odysseus modal pattern (see tasks.js, agent-dashboard.js)
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _results = [];
let _recent = [];
let _activeFilter = 'all';
let _searchQuery = '';
let _stats = null;
let _escHandler = null;

// ── Mock data (Phase 1) — replace with real API in Phase 2 ──
const _mockResults = [
  {
    id: 'obs-1',
    title: 'Perri Chase CIRS Protocol',
    snippet: 'Chronic Inflammatory Response Syndrome treatment protocol including binders, nasal spray, and environmental remediation steps.',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    date: '2026-05-28T14:32:00Z',
    path: 'Health/Perri/CIRS Protocol.md',
    tags: ['health', 'cirs', 'perri']
  },
  {
    id: 'obs-2',
    title: 'Team Chase LLC Tech Stack',
    snippet: 'CRM: HubSpot | Checkout: SamCart | Web: ShowIt | Integration: Zapier | Community: Mighty Networks | Video: Vimeo',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    date: '2026-04-12T09:15:00Z',
    path: 'Business/Team Chase/Tech Stack.md',
    tags: ['business', 'tech-stack']
  },
  {
    id: 'rag-1',
    title: 'Magic Led Business — Course Outline',
    snippet: 'Module 1: Permission & Presence | Module 2: Embodied Decision Making | Module 3: Sovereign Sales | Module 4: Magnetic Messaging',
    source: 'qdrant',
    sourceLabel: 'Qdrant (RAG)',
    date: '2026-05-20T11:00:00Z',
    path: 'courses/magic-led-business/outline',
    score: 0.94,
    tags: ['course', 'perri', 'magic-led']
  },
  {
    id: 'rag-2',
    title: 'Chiron System Architecture',
    snippet: 'OpenClaw agent running on Watchtower (headless MacBook Pro). Telegram-first interface. Modular skill system with SKILL.md pattern.',
    source: 'qdrant',
    sourceLabel: 'Qdrant (RAG)',
    date: '2026-05-15T16:45:00Z',
    path: 'ai/chiron/architecture',
    score: 0.91,
    tags: ['ai', 'chiron', 'architecture']
  },
  {
    id: 'log-1',
    title: 'Session 2026-05-30 — Linear API Integration',
    snippet: 'Successfully integrated Linear API for task board. OAuth flow completed. Issues syncing from TEA and WD projects.',
    source: 'session_log',
    sourceLabel: 'Session Logs',
    date: '2026-05-30T18:22:00Z',
    path: 'sessions/2026-05-30-linear-integration.log',
    tags: ['dev', 'linear', 'api']
  },
  {
    id: 'log-2',
    title: 'Session 2026-05-28 — Fabio OAuth Setup',
    snippet: 'Configured Fabio agent with Gmail OAuth. Delegation for support@perrichase.com granted. Token propagation verified.',
    source: 'session_log',
    sourceLabel: 'Session Logs',
    date: '2026-05-28T13:10:00Z',
    path: 'sessions/2026-05-28-fabio-oauth.log',
    tags: ['dev', 'fabio', 'oauth']
  },
  {
    id: 'daily-1',
    title: '2026-05-30 — Daily Note',
    snippet: 'Completed Linear API wiring for task board. Morning briefing skill running. Archie PT scheduled for next week.',
    source: 'daily_note',
    sourceLabel: 'Daily Notes',
    date: '2026-05-30T07:00:00Z',
    path: 'memory/2026-05-30.md',
    tags: ['daily', 'archie', 'linear']
  },
  {
    id: 'daily-2',
    title: '2026-05-28 — Daily Note',
    snippet: 'Mexico trip planning. Packing list finalized. Dog sitter briefed on Archie post-surgery limitations. Perri CIRS flare subsiding.',
    source: 'daily_note',
    sourceLabel: 'Daily Notes',
    date: '2026-05-28T07:00:00Z',
    path: 'memory/2026-05-28.md',
    tags: ['daily', 'mexico', 'archie', 'perri']
  },
  {
    id: 'obs-3',
    title: 'Scarlet Jiu Jitsu Competition Calendar',
    snippet: 'JJWL June 19, 2026 — registered on Smoothcomp. NAGA July 15. Goal: 4 competitions per year. Coach: Tim.',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    date: '2026-05-25T10:00:00Z',
    path: 'Family/Scarlet/Jiu Jitsu.md',
    tags: ['scarlet', 'jiu-jitsu', 'competition']
  },
  {
    id: 'rag-3',
    title: 'Permission Studios — Product Roadmap',
    snippet: 'Q3 2026: The Perfect Cut MVP. Q4: MLB RAG Pipeline production. 2027 Q1: AI Admin Agent full automation.',
    source: 'qdrant',
    sourceLabel: 'Qdrant (RAG)',
    date: '2026-05-10T09:00:00Z',
    path: 'products/permission-studios/roadmap',
    score: 0.88,
    tags: ['product', 'roadmap', 'permission-studios']
  }
];

const _mockRecent = _mockResults.slice(0, 5);

const _mockStats = {
  totalMemories: 1247,
  lastIndexed: '2026-06-04T12:00:00Z',
  sources: {
    obsidian: 623,
    qdrant: 312,
    session_log: 198,
    daily_note: 114
  }
};

// ── Theme constants ──
const THEME = {
  bg: '#1A1A1A',
  panel: '#235E36',
  text: '#F9EBDC',
  accent: '#A8E10C',
  border: '#FAAFCC'
};

// ── Helpers ──
function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function _sourceIcon(source) {
  const icons = {
    obsidian: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    qdrant: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
    session_log: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    daily_note: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
  };
  return icons[source] || icons.obsidian;
}

function _sourceColor(source) {
  const colors = {
    obsidian: '#B2EAEA',
    qdrant: '#A8E10C',
    session_log: '#FAAFCC',
    daily_note: '#F9EBDC'
  };
  return colors[source] || '#F9EBDC';
}

// ── Data fetching (mock for now) ──
async function _fetchMemories() {
  // Phase 2: replace with real fetch:
  // const res = await fetch(`${API_BASE}/api/memory/search?q=${encodeURIComponent(_searchQuery)}&source=${_activeFilter}`);
  // _results = await res.json();
  _results = [..._mockResults];
  _recent = [..._mockRecent];
  _stats = { ..._mockStats };
}

function _filterResults() {
  let filtered = _results;
  if (_activeFilter !== 'all') {
    filtered = filtered.filter(r => r.source === _activeFilter);
  }
  if (_searchQuery.trim()) {
    const q = _searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.snippet && r.snippet.toLowerCase().includes(q)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  return filtered;
}

// ── Rendering ──
function _renderStats(container) {
  if (!_stats) return;
  const s = _stats;
  const el = document.createElement('div');
  el.style.cssText = `display:flex;gap:16px;align-items:center;padding:10px 14px;background:${THEME.panel}22;border:1px solid ${THEME.border}33;border-radius:8px;margin-bottom:14px;`;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="font-size:18px;font-weight:700;color:${THEME.accent};">${s.totalMemories.toLocaleString()}</span>
      <span style="font-size:11px;opacity:0.6;">total memories</span>
    </div>
    <div style="width:1px;height:20px;background:${THEME.border}44;"></div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="font-size:11px;opacity:0.6;">Last indexed:</span>
      <span style="font-size:11px;font-weight:500;">${_fmtDate(s.lastIndexed)}</span>
    </div>
    <div style="width:1px;height:20px;background:${THEME.border}44;"></div>
    <div style="display:flex;gap:10px;align-items:center;">
      ${Object.entries(s.sources).map(([src, count]) => `
        <span style="display:flex;align-items:center;gap:4px;font-size:10px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${_sourceColor(src)};"></span>
          ${_esc({obsidian:'Obsidian',qdrant:'Qdrant',session_log:'Logs',daily_note:'Daily'}[src]||src)} ${count}
        </span>
      `).join('')}
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(el);
}

function _renderFilterTabs(container) {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'obsidian', label: 'Obsidian Vault' },
    { id: 'qdrant', label: 'Qdrant (RAG)' },
    { id: 'session_log', label: 'Session Logs' },
    { id: 'daily_note', label: 'Daily Notes' }
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';

  tabs.forEach(t => {
    const btn = document.createElement('button');
    const active = t.id === _activeFilter;
    btn.style.cssText = `
      padding:5px 12px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;
      border:1px solid ${active ? THEME.accent : THEME.border + '44'};
      background:${active ? THEME.accent + '22' : 'transparent'};
      color:${active ? THEME.accent : THEME.text};
      transition:all 0.15s;
    `;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      _activeFilter = t.id;
      _render();
    });
    wrap.appendChild(btn);
  });

  container.innerHTML = '';
  container.appendChild(wrap);
}

function _renderResults(container) {
  const filtered = _filterResults();
  if (!filtered.length) {
    container.innerHTML = `<div style="opacity:0.4;font-size:12px;text-align:center;padding:40px 0;">No memories found.</div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  for (const r of filtered) {
    const card = document.createElement('div');
    card.style.cssText = `
      background:${THEME.panel}18;border:1px solid ${THEME.border}33;border-radius:8px;
      padding:12px;cursor:pointer;transition:all 0.15s;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = THEME.border + '88';
      card.style.background = THEME.panel + '30';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = THEME.border + '33';
      card.style.background = THEME.panel + '18';
    });

    const srcColor = _sourceColor(r.source);
    const scoreBadge = r.score ? `<span style="font-size:10px;background:${srcColor}22;color:${srcColor};padding:2px 6px;border-radius:4px;margin-left:6px;">score ${r.score}</span>` : '';

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="color:${srcColor};display:flex;align-items:center;">${_sourceIcon(r.source)}</span>
        <span style="font-size:10px;opacity:0.5;text-transform:uppercase;letter-spacing:0.5px;">${_esc(r.sourceLabel)}</span>
        <span style="margin-left:auto;font-size:10px;opacity:0.4;">${_fmtDate(r.date)}</span>
      </div>
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;line-height:1.4;">${_esc(r.title)}</div>
      <div style="font-size:12px;opacity:0.7;line-height:1.5;margin-bottom:8px;">${_esc(r.snippet)}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        ${r.tags.map(tag => `<span style="font-size:10px;background:${THEME.bg};padding:2px 6px;border-radius:4px;opacity:0.5;">#${_esc(tag)}</span>`).join('')}
        ${scoreBadge}
      </div>
      <div style="font-size:10px;opacity:0.35;margin-top:6px;font-family:monospace;">${_esc(r.path)}</div>
    `;
    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

function _renderRecent(container) {
  if (!_recent.length) {
    container.innerHTML = `<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px 0;">No recent memories.</div>`;
    return;
  }

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  for (const r of _recent) {
    const item = document.createElement('div');
    item.style.cssText = `
      padding:8px 10px;border-radius:6px;cursor:pointer;
      background:transparent;border:1px solid transparent;
      transition:all 0.15s;
    `;
    item.addEventListener('mouseenter', () => {
      item.style.background = THEME.panel + '22';
      item.style.borderColor = THEME.border + '33';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
      item.style.borderColor = 'transparent';
    });

    const srcColor = _sourceColor(r.source);
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="color:${srcColor};display:flex;align-items:center;">${_sourceIcon(r.source)}</span>
        <span style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${_esc(r.title)}</span>
      </div>
      <div style="font-size:10px;opacity:0.4;padding-left:18px;">${_fmtDate(r.date)} · ${_esc(r.sourceLabel)}</div>
    `;
    list.appendChild(item);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

function _render() {
  const body = document.getElementById('memory-browser-body');
  if (!body) return;

  const filtered = _filterResults();
  const countEl = document.getElementById('memory-browser-count');
  if (countEl) {
    countEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
  }

  // Build layout: left = search + results, right = recent sidebar
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:14px;height:100%;overflow:hidden;';

  // Left column
  const left = document.createElement('div');
  left.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:0;overflow:auto;';

  // Stats bar
  const statsWrap = document.createElement('div');
  statsWrap.id = 'memory-browser-stats';
  left.appendChild(statsWrap);

  // Filter tabs
  const filterWrap = document.createElement('div');
  filterWrap.id = 'memory-browser-filters';
  left.appendChild(filterWrap);

  // Results
  const resultsWrap = document.createElement('div');
  resultsWrap.id = 'memory-browser-results';
  resultsWrap.style.cssText = 'flex:1;min-height:0;overflow:auto;padding-right:4px;';
  left.appendChild(resultsWrap);

  // Right sidebar
  const right = document.createElement('div');
  right.style.cssText = `
    width:220px;flex-shrink:0;display:flex;flex-direction:column;
    border-left:1px solid ${THEME.border}33;padding-left:14px;
    overflow:hidden;
  `;

  const recentHeader = document.createElement('div');
  recentHeader.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.5;margin-bottom:10px;';
  recentHeader.textContent = 'Recent Memories';
  right.appendChild(recentHeader);

  const recentWrap = document.createElement('div');
  recentWrap.id = 'memory-browser-recent';
  recentWrap.style.cssText = 'flex:1;overflow:auto;';
  right.appendChild(recentWrap);

  wrap.appendChild(left);
  wrap.appendChild(right);

  body.innerHTML = '';
  body.appendChild(wrap);

  _renderStats(statsWrap);
  _renderFilterTabs(filterWrap);
  _renderResults(resultsWrap);
  _renderRecent(recentWrap);
}

// ── Public API ──
export function openMemoryBrowser() {
  if (_open) return;
  _open = true;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'memory-browser-modal';
  modal.innerHTML = `
    <div class="modal-content" style="width:900px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h4 style="position:relative;top:-2px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
          </svg>
          Memory Browser
        </h4>
        <span style="flex:1"></span>
        <span id="memory-browser-count" style="font-size:11px;opacity:0.6;margin-right:12px;">0 results</span>
        <button class="close-btn" id="memory-browser-close">✖</button>
      </div>
      <div style="padding:12px 16px 0;border-bottom:1px solid var(--border);">
        <div style="position:relative;margin-bottom:10px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.4;">
            <circle cx="10" cy="10" r="7"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" id="memory-browser-search" placeholder="Search across all memory sources..."
            style="width:100%;padding:8px 10px 8px 32px;border-radius:6px;border:1px solid ${THEME.border}44;background:${THEME.bg};color:${THEME.text};font-size:13px;outline:none;box-sizing:border-box;"
            value="${_esc(_searchQuery)}"
          />
        </div>
      </div>
      <div class="modal-body" id="memory-browser-body" style="flex:1;overflow:hidden;padding:14px 16px;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Draggable
  {
    const c = modal.querySelector('.modal-content');
    const h = modal.querySelector('.modal-header');
    if (c && h) makeWindowDraggable(modal, { content: c, header: h });
  }

  // Close handlers
  document.getElementById('memory-browser-close').addEventListener('click', closeMemoryBrowser);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeMemoryBrowser(); });

  // Search input
  const searchInput = document.getElementById('memory-browser-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      _searchQuery = e.target.value;
      _render();
    });
    searchInput.focus();
  }

  // ESC handler
  _escHandler = (e) => { if (e.key === 'Escape') closeMemoryBrowser(); };
  document.addEventListener('keydown', _escHandler);

  // Load data and render
  _fetchMemories().then(() => _render());
}

export function closeMemoryBrowser() {
  if (!_open) return;
  _open = false;
  if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
  const modal = document.getElementById('memory-browser-modal');
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

export function isMemoryBrowserOpen() {
  return _open;
}
