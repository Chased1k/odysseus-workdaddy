/**
 * Agent Calendar — floating modal showing agent cron jobs,
 * scheduled tasks, and execution timeline.
 * Follows Odysseus modal pattern (see tasks.js).
 *
 * Phase 1: mock data. Structured for future API replacement.
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _escHandler = null;
let _view = 'week';
let _currentDate = new Date();
let _events = [];
let _hiddenAgents = new Set();

// ── Agent Config ──
const AGENTS = {
  chiron: { label: 'Chiron', color: '#A8E10C', class: 'chiron' },
  fabio:  { label: 'Fabio',  color: '#FAAFCC', class: 'fabio' },
  hermes: { label: 'Hermes', color: '#B2EAEA', class: 'hermes' },
};

const VIEWS = ['month', 'week', 'day'];

// ── Mock Data ──
function _mockEvents() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const ev = (agent, dayOffset, hour, durationMin, title, type, opts = {}) => {
    const s = new Date(y, m, d + dayOffset, hour, 0, 0);
    const e = new Date(s.getTime() + durationMin * 60000);
    return {
      id: opts.id || Math.random().toString(36).slice(2, 10),
      title,
      agent,
      start: s.toISOString(),
      end: e.toISOString(),
      type,
      command: opts.command || null,
      desc: opts.desc || null,
      allDay: opts.allDay || false,
    };
  };

  return [
    // Chiron
    ev('chiron', -1, 6, 30, 'Morning Briefing', 'cron', { command: 'morning-briefing skill', desc: 'Markets, AI news, schedule, urgent items, inbox cleanup.' }),
    ev('chiron', 0, 7, 15, 'Inbox Check — Kellen', 'scheduled', { command: 'check kellen@perrichase.com unread', desc: 'Summarize urgent emails, flag action items.' }),
    ev('chiron', 0, 9, 30, 'GSM Call Setup', 'scheduled', { command: 'gsm-call-scheduler skill', desc: 'Schedule weekly God, Sex & Money call on Mighty Networks + Zoom.' }),
    ev('chiron', 0, 14, 20, 'Inbox Check — Support', 'scheduled', { command: 'check support@perrichase.com unread' }),
    ev('chiron', 1, 6, 30, 'Morning Briefing', 'cron', { command: 'morning-briefing skill' }),
    ev('chiron', 1, 12, 45, 'MLB RAG Pipeline — Stage 4', 'scheduled', { command: "Continue Qdrant setup for Perri's RAG pipeline", desc: 'Transcript cleaning → embedding → Qdrant vector DB.' }),
    ev('chiron', 2, 6, 30, 'Morning Briefing', 'cron', { command: 'morning-briefing skill' }),
    ev('chiron', 2, 16, 60, 'Warrior Dog — Sprint 8', 'scheduled', { command: 'Phaser game dev session with Scarlet', desc: 'Levels 2–10, outfit fixes, attack/progression.' }),
    ev('chiron', 3, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 4, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 5, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 6, 6, 30, 'Morning Briefing', 'cron'),

    // Fabio
    ev('fabio', 0, 10, 120, 'Video Review & Cut Notes', 'scheduled', { command: 'video-review skill', desc: 'Transcribe reels, extract frames, deliver cut feedback.' }),
    ev('fabio', 0, 15, 90, 'Canva Export Batch', 'scheduled', { command: 'canva skill — export designs', desc: 'Batch export finished designs to PNG/PDF for social.' }),
    ev('fabio', 1, 11, 60, 'Social Content Draft', 'scheduled', { command: 'Draft Instagram carousel + captions' }),
    ev('fabio', 2, 14, 45, 'MN Community Dossier Update', 'scheduled', { command: 'mn-dossier skill — member intelligence sync' }),
    ev('fabio', 3, 10, 120, 'Video Review & Cut Notes', 'scheduled', { command: 'video-review skill' }),
    ev('fabio', 4, 13, 60, 'Weekly Content Calendar Review', 'scheduled', { command: "Review + schedule next week's posts" }),
    ev('fabio', 5, 16, 30, 'Fabio Agent Health Check', 'cron', { command: 'self-check: tasks, memory, logs' }),

    // Hermes
    ev('hermes', 0, 3, 15, 'Nightly Backup — Vault', 'cron', { command: 'rsync ~/.openclaw/workspace → backup target' }),
    ev('hermes', 0, 8, 20, 'Vercel Deploy — Perfect Cut', 'scheduled', { command: 'git push + vercel --prod', desc: 'Deploy The Perfect Cut app to production.' }),
    ev('hermes', 1, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 1, 18, 30, 'Server Health Report', 'cron', { command: 'healthcheck skill — system audit' }),
    ev('hermes', 2, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 2, 11, 45, 'SamCart Order Sync → HubSpot', 'scheduled', { command: 'samcart skill → hubspot update' }),
    ev('hermes', 3, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 3, 20, 30, 'OpenClaw Gateway Restart', 'scheduled', { command: 'openclaw gateway restart', desc: 'Weekly maintenance window for gateway daemon.' }),
    ev('hermes', 4, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 5, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 6, 3, 15, 'Nightly Backup — Vault', 'cron'),

    // All-day windows
    {
      id: 'exec-window-1',
      title: 'Chiron Execution Window',
      agent: 'chiron',
      start: new Date(y, m, d - 2, 0, 0, 0).toISOString(),
      end: new Date(y, m, d - 1, 0, 0, 0).toISOString(),
      type: 'execution-window',
      allDay: true,
      desc: 'General availability for ad-hoc tasks and priority triage.',
    },
    {
      id: 'exec-window-2',
      title: 'Hermes Maintenance Window',
      agent: 'hermes',
      start: new Date(y, m, d + 3, 0, 0, 0).toISOString(),
      end: new Date(y, m, d + 4, 0, 0, 0).toISOString(),
      type: 'execution-window',
      allDay: true,
      desc: 'Infrastructure maintenance, updates, and patching.',
    },
  ];
}

// ── Helpers ──
function _esc(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function _isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function _addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function _startOfWeek(d) {
  const r = new Date(d);
  const dow = r.getDay(); // 0 = Sunday
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}
function _formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function _fmtDateRange(start, end) {
  const s = new Date(start), e = new Date(end);
  const sameDay = _isSameDay(s, e);
  const opts = { month: 'short', day: 'numeric' };
  if (s.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  let out = s.toLocaleDateString(undefined, opts);
  if (sameDay) {
    out += ` · ${_formatTime(start)} – ${_formatTime(end)}`;
  } else {
    out += ` ${_formatTime(start)} — `;
    const eopts = { month: 'short', day: 'numeric' };
    if (e.getFullYear() !== new Date().getFullYear()) eopts.year = 'numeric';
    out += e.toLocaleDateString(undefined, eopts) + ` ${_formatTime(end)}`;
  }
  return out;
}

function _eventsForDay(d) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return _events
    .filter((ev) => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      return s <= end && e >= start;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function _getEvent(id) {
  return _events.find((e) => e.id === id);
}

// ── Styles (injected once) ──
let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = document.createElement('style');
  css.id = 'agent-calendar-styles';
  css.textContent = `
    .agent-cal-wrap { display:flex;flex-direction:column;height:100%; }
    .agent-cal-header { display:flex;align-items:center;gap:8px;padding:0 4px 8px;border-bottom:1px solid var(--border,#FAAFCC22);margin-bottom:8px; }
    .agent-cal-title { font-size:14px;font-weight:600; }
    .agent-cal-nav-btn { background:transparent;border:1px solid var(--border,#FAAFCC44);border-radius:4px;padding:3px 8px;color:var(--fg,#F9EBDC);cursor:pointer;font-size:12px; }
    .agent-cal-nav-btn:hover { background:var(--panel-bg,#235E36); }
    .agent-cal-view-btn { background:transparent;border:1px solid var(--border,#FAAFCC44);border-radius:4px;padding:3px 10px;color:var(--fg,#F9EBDC);cursor:pointer;font-size:11px; }
    .agent-cal-view-btn.active { background:#A8E10C;color:#1A1A1A;border-color:#A8E10C;font-weight:600; }
    .agent-cal-subtitle { flex:1;text-align:center;font-size:13px;opacity:0.8; }
    .agent-cal-legend { display:flex;gap:12px;padding:6px 4px 0;font-size:11px; }
    .agent-cal-legend-item { display:flex;align-items:center;gap:4px;cursor:pointer;opacity:1;transition:opacity .2s;user-select:none; }
    .agent-cal-legend-item.hidden { opacity:0.3;text-decoration:line-through; }
    .agent-cal-dot { width:8px;height:8px;border-radius:50%; }
    .agent-cal-grid-wrap { flex:1;overflow:auto;margin-top:8px; }

    /* Month grid */
    .cal-month-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border,#FAAFCC22);border:1px solid var(--border,#FAAFCC22);border-radius:6px;overflow:hidden; }
    .cal-month-header { display:contents; }
    .cal-month-header .cal-day-label { background:var(--panel-bg,#235E36);padding:6px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;text-align:center; }
    .cal-month-cell { background:var(--bg,#1A1A1A);min-height:90px;padding:4px;position:relative; }
    .cal-month-cell.outside { opacity:0.45; }
    .cal-month-cell.today { background:#235E3666; }
    .cal-month-cell .cal-day-num { font-size:11px;opacity:0.6;margin-bottom:2px; }
    .cal-month-cell .cal-event { font-size:10px;padding:1px 4px;border-radius:3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer; }

    /* Week grid */
    .cal-week-grid { display:flex;flex-direction:column;gap:1px;background:var(--border,#FAAFCC22);border:1px solid var(--border,#FAAFCC22);border-radius:6px;overflow:hidden; }
    .cal-week-header { display:grid;grid-template-columns:44px repeat(7,1fr);background:var(--panel-bg,#235E36); }
    .cal-week-header .cal-day-label { padding:6px;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:0.5px; }
    .cal-week-header .cal-day-label.today { color:#A8E10C;font-weight:700; }
    .cal-week-header .cal-time-gutter { border-right:1px solid var(--border,#FAAFCC22); }
    .cal-week-row { display:grid;grid-template-columns:44px repeat(7,1fr);min-height:52px; }
    .cal-week-row .cal-time-gutter { border-right:1px solid var(--border,#FAAFCC22);font-size:9px;padding:3px;text-align:right;opacity:0.5; }
    .cal-week-row .cal-week-cell { border-right:1px solid var(--border,#FAAFCC22);position:relative; }
    .cal-week-row .cal-week-cell.today { background:#235E3666; }
    .cal-week-row .cal-week-cell:last-child { border-right:none; }

    /* Day grid */
    .cal-day-grid { display:flex;flex-direction:column;gap:1px;background:var(--border,#FAAFCC22);border:1px solid var(--border,#FAAFCC22);border-radius:6px;overflow:hidden; }
    .cal-day-row { display:grid;grid-template-columns:44px 1fr;min-height:52px; }
    .cal-day-row .cal-time-gutter { border-right:1px solid var(--border,#FAAFCC22);font-size:9px;padding:3px;text-align:right;opacity:0.5; }
    .cal-day-row .cal-week-cell { position:relative; }
    .cal-day-row .cal-week-cell.today { background:#235E3666; }

    /* Events */
    .cal-event { font-size:10px;padding:2px 5px;border-radius:3px;cursor:pointer;border-left:3px solid transparent;transition:filter .15s; }
    .cal-event:hover { filter:brightness(1.15); }
    .cal-event.chiron { background:#A8E10C22;border-left-color:#A8E10C;color:#F9EBDC; }
    .cal-event.fabio  { background:#FAAFCC22;border-left-color:#FAAFCC;color:#F9EBDC; }
    .cal-event.hermes { background:#B2EAEA22;border-left-color:#B2EAEA;color:#F9EBDC; }
    .cal-event.all-day { font-weight:600; }

    /* Detail / Add modal */
    #agent-cal-modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s; }
    #agent-cal-modal-overlay.open { opacity:1;pointer-events:auto; }
    .agent-cal-modal { background:var(--bg,#1A1A1A);border:1px solid var(--border,#FAAFCC44);border-radius:10px;width:420px;max-width:90vw;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.4); }
    .agent-cal-modal-header { display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border,#FAAFCC22); }
    .agent-cal-modal-header h4 { margin:0;font-size:14px; }
    .agent-cal-modal-body { padding:14px 16px;flex:1;overflow:auto;font-size:12px; }
    .agent-cal-detail-row { display:flex;align-items:flex-start;gap:8px;margin-bottom:8px; }
    .agent-cal-detail-row .label { min-width:70px;opacity:0.6;font-size:11px; }
    .agent-cal-detail-badge { display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600; }
    .agent-cal-detail-badge.chiron { background:#A8E10C33;color:#A8E10C;border:1px solid #A8E10C44; }
    .agent-cal-detail-badge.fabio  { background:#FAAFCC33;color:#FAAFCC;border:1px solid #FAAFCC44; }
    .agent-cal-detail-badge.hermes { background:#B2EAEA33;color:#B2EAEA;border:1px solid #B2EAEA44; }
    .agent-cal-modal-actions { display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border,#FAAFCC22);justify-content:flex-end; }
    .agent-cal-btn { background:transparent;border:1px solid var(--border,#FAAFCC44);border-radius:6px;padding:6px 14px;color:var(--fg,#F9EBDC);cursor:pointer;font-size:12px; }
    .agent-cal-btn.primary { background:#A8E10C;color:#1A1A1A;border-color:#A8E10C;font-weight:600; }
    .agent-cal-btn:hover { filter:brightness(1.1); }
    .agent-cal-field { margin-bottom:10px; }
    .agent-cal-field label { display:block;font-size:10px;opacity:0.6;margin-bottom:3px; }
    .agent-cal-field input,
    .agent-cal-field select,
    .agent-cal-field textarea { width:100%;background:var(--bg,#1A1A1A);border:1px solid var(--border,#FAAFCC44);border-radius:5px;padding:6px 8px;color:var(--fg,#F9EBDC);font-size:12px;box-sizing:border-box; }
    .agent-cal-field textarea { min-height:48px;resize:vertical; }
    .agent-cal-row { display:flex;gap:8px; }
    .agent-cal-row > .agent-cal-field { flex:1; }
  `;
  document.head.appendChild(css);
}

// ── Render: Month ──
function _renderMonth(container) {
  const year = _currentDate.getFullYear();
  const month = _currentDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = _addDays(first, -first.getDay());
  const end = _addDays(last, 6 - last.getDay());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = `<div class="cal-month-header">`;
  for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
    html += `<div class="cal-day-label">${day}</div>`;
  }
  html += `</div>`;

  for (let d = new Date(start); d <= end; d = _addDays(d, 1)) {
    const outside = d.getMonth() !== month;
    const isToday = _isSameDay(d, today);
    const cellEvents = _eventsForDay(d);
    let cls = 'cal-month-cell';
    if (outside) cls += ' outside';
    if (isToday) cls += ' today';

    html += `<div class="${cls}" data-date="${d.toISOString()}">`;
    html += `<div class="cal-day-num">${d.getDate()}</div>`;
    for (const ev of cellEvents) {
      if (_hiddenAgents.has(ev.agent)) continue;
      const a = AGENTS[ev.agent];
      html += `<div class="cal-event ${a.class} ${ev.allDay ? 'all-day' : ''}" data-id="${ev.id}">`;
      if (!ev.allDay) html += `${_formatTime(ev.start)} `;
      html += `${_esc(ev.title)}</div>`;
    }
    html += `</div>`;
  }

  container.className = 'cal-month-grid';
  container.innerHTML = html;
}

// ── Render: Week ──
function _renderWeek(container) {
  const sow = _startOfWeek(_currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = `<div class="cal-week-header">`;
  html += `<div class="cal-time-gutter"></div>`;
  for (let i = 0; i < 7; i++) {
    const d = _addDays(sow, i);
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
    const cls = _isSameDay(d, today) ? ' today' : '';
    html += `<div class="cal-day-label${cls}">${label}</div>`;
  }
  html += `</div>`;

  for (let h = 0; h < 24; h++) {
    html += `<div class="cal-week-row">`;
    html += `<div class="cal-time-gutter">${h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM'}</div>`;
    for (let i = 0; i < 7; i++) {
      const d = _addDays(sow, i);
      const isToday = _isSameDay(d, today);
      html += `<div class="cal-week-cell ${isToday ? 'today' : ''}" data-date="${d.toISOString()}" data-hour="${h}"></div>`;
    }
    html += `</div>`;
  }

  container.className = 'cal-week-grid';
  container.innerHTML = html;

  for (let i = 0; i < 7; i++) {
    const d = _addDays(sow, i);
    const cellEvents = _eventsForDay(d).filter((e) => !_hiddenAgents.has(e.agent));
    for (const ev of cellEvents) {
      if (ev.allDay) {
        _placeWeekEvent(ev, d, 0, true);
      } else {
        const sh = new Date(ev.start).getHours();
        _placeWeekEvent(ev, d, sh, false);
      }
    }
  }
}

function _placeWeekEvent(ev, dayDate, hour, allDay) {
  const cells = Array.from(document.querySelectorAll('.cal-week-cell'));
  const sow = _startOfWeek(dayDate);
  const dayIndex = Math.round((dayDate - sow) / 86400000);
  const rowIndex = allDay ? 0 : hour + 1;
  const cellIndex = rowIndex * 7 + dayIndex;
  const cell = cells[cellIndex];
  if (!cell) return;

  const a = AGENTS[ev.agent];
  const el = document.createElement('div');
  el.className = `cal-event ${a.class} ${allDay ? 'all-day' : ''}`;
  el.dataset.id = ev.id;
  if (!allDay) {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    const topPct = (s.getMinutes() / 60) * 100;
    const h = (e - s) / 3600000;
    const heightPct = Math.max(h * 100, 18);
    el.style.cssText = `position:absolute;top:${topPct}%;height:${heightPct}%;left:2px;right:2px;z-index:2;`;
  } else {
    el.style.cssText = 'position:absolute;top:2px;left:2px;right:2px;z-index:2;';
  }
  el.textContent = ev.title;
  cell.appendChild(el);
}

// ── Render: Day ──
function _renderDay(container) {
  const d = new Date(_currentDate);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = _isSameDay(d, today);

  let html = '';
  for (let h = 0; h < 24; h++) {
    html += `<div class="cal-day-row">`;
    html += `<div class="cal-time-gutter">${h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM'}</div>`;
    html += `<div class="cal-week-cell ${isToday ? 'today' : ''}" data-date="${d.toISOString()}" data-hour="${h}"></div>`;
    html += `</div>`;
  }

  container.className = 'cal-day-grid';
  container.innerHTML = html;

  const cellEvents = _eventsForDay(d).filter((e) => !_hiddenAgents.has(e.agent));
  for (const ev of cellEvents) {
    if (ev.allDay) {
      _placeDayEvent(ev, 0, true);
    } else {
      const sh = new Date(ev.start).getHours();
      _placeDayEvent(ev, sh, false);
    }
  }
}

function _placeDayEvent(ev, hour, allDay) {
  const cells = Array.from(document.querySelectorAll('.cal-day-grid .cal-week-cell'));
  const cell = cells[allDay ? 0 : hour];
  if (!cell) return;

  const a = AGENTS[ev.agent];
  const el = document.createElement('div');
  el.className = `cal-event ${a.class} ${allDay ? 'all-day' : ''}`;
  el.dataset.id = ev.id;
  if (!allDay) {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    const topPct = (s.getMinutes() / 60) * 100;
    const h = (e - s) / 3600000;
    const heightPct = Math.max(h * 100, 18);
    el.style.cssText = `position:absolute;top:${topPct}%;height:${heightPct}%;left:2px;right:2px;z-index:2;`;
  } else {
    el.style.cssText = 'position:absolute;top:2px;left:2px;right:2px;z-index:2;';
  }
  el.textContent = ev.title;
  cell.appendChild(el);
}

// ── Subtitles ──
function _updateSubtitle(container) {
  const el = container.querySelector('.agent-cal-subtitle');
  if (!el) return;
  if (_view === 'month') {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    el.textContent = `${months[_currentDate.getMonth()]} ${_currentDate.getFullYear()}`;
  } else if (_view === 'week') {
    const sow = _startOfWeek(_currentDate);
    const eow = _addDays(sow, 6);
    const opts = { month: 'short', day: 'numeric' };
    if (sow.getFullYear() !== eow.getFullYear()) opts.year = 'numeric';
    const endOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    el.textContent = `${sow.toLocaleDateString(undefined, opts)} — ${eow.toLocaleDateString(undefined, endOpts)}`;
  } else {
    el.textContent = _currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
}

// ── Main render ──
function _renderAll() {
  const grid = document.getElementById('agent-cal-grid');
  if (!grid) return;
  if (_view === 'month') _renderMonth(grid);
  else if (_view === 'week') _renderWeek(grid);
  else _renderDay(grid);

  // Re-bind clicks
  grid.addEventListener('click', (e) => {
    const eventEl = e.target.closest('.cal-event');
    if (eventEl) {
      const ev = _getEvent(eventEl.dataset.id);
      if (ev) _openDetailModal(ev);
      return;
    }
    const cell = e.target.closest('.cal-month-cell, .cal-week-cell');
    if (cell && cell.dataset.date) {
      _openAddModal(new Date(cell.dataset.date));
    }
  });

  const wrap = grid.closest('.agent-cal-wrap') || grid;
  _updateSubtitle(wrap);
}

// ── Event Detail Modal ──
function _openDetailModal(ev) {
  const a = AGENTS[ev.agent];
  const overlay = document.getElementById('agent-cal-modal-overlay');
  const title = document.getElementById('agent-cal-modal-title');
  const body = document.getElementById('agent-cal-modal-body');
  const actions = document.getElementById('agent-cal-modal-actions');
  if (!overlay || !title || !body || !actions) return;

  title.textContent = ev.title;

  let html = '';
  html += `<div class="agent-cal-detail-row"><span class="label">Agent</span><span class="agent-cal-detail-badge ${a.class}">${a.label}</span></div>`;
  html += `<div class="agent-cal-detail-row"><span class="label">When</span><span>${_fmtDateRange(ev.start, ev.end)}</span></div>`;
  html += `<div class="agent-cal-detail-row"><span class="label">Type</span><span>${_esc(ev.type)}</span></div>`;
  if (ev.command) {
    html += `<div class="agent-cal-detail-row"><span class="label">Command</span><span style="font-family:monospace;font-size:0.78rem;word-break:break-all;">${_esc(ev.command)}</span></div>`;
  }
  if (ev.desc) {
    html += `<div class="agent-cal-detail-row"><span class="label">Note</span><span>${_esc(ev.desc)}</span></div>`;
  }

  body.innerHTML = html;
  actions.innerHTML = `<button class="agent-cal-btn" id="agent-cal-modal-close">Close</button>`;
  document.getElementById('agent-cal-modal-close').onclick = _closeModal;

  overlay.classList.add('open');
}

// ── Add Task Modal ──
function _openAddModal(preDate) {
  const overlay = document.getElementById('agent-cal-modal-overlay');
  const title = document.getElementById('agent-cal-modal-title');
  const body = document.getElementById('agent-cal-modal-body');
  const actions = document.getElementById('agent-cal-modal-actions');
  if (!overlay || !title || !body || !actions) return;

  title.textContent = 'Add Scheduled Task';

  const dateStr = preDate ? preDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const timeStr = preDate ? `${String(preDate.getHours()).padStart(2, '0')}:00` : '09:00';

  body.innerHTML = `
    <div class="agent-cal-field"><label>Title</label><input type="text" id="addTitle" placeholder="e.g. Morning Briefing" /></div>
    <div class="agent-cal-row">
      <div class="agent-cal-field"><label>Agent</label>
        <select id="addAgent"><option value="chiron">Chiron</option><option value="fabio">Fabio</option><option value="hermes">Hermes</option></select>
      </div>
      <div class="agent-cal-field"><label>Type</label>
        <select id="addType"><option value="scheduled">Scheduled</option><option value="cron">Cron Job</option><option value="execution-window">Execution Window</option></select>
      </div>
    </div>
    <div class="agent-cal-row">
      <div class="agent-cal-field"><label>Date</label><input type="date" id="addDate" value="${dateStr}" /></div>
      <div class="agent-cal-field"><label>Start Time</label><input type="time" id="addTime" value="${timeStr}" /></div>
      <div class="agent-cal-field"><label>Duration (min)</label><input type="number" id="addDuration" value="30" min="5" /></div>
    </div>
    <div class="agent-cal-field"><label>Command / Script</label><input type="text" id="addCommand" placeholder="e.g. morning-briefing skill" /></div>
    <div class="agent-cal-field"><label>Description</label><textarea id="addDesc" placeholder="What does this task do?"></textarea></div>
  `;

  actions.innerHTML = `
    <button class="agent-cal-btn" id="agent-cal-modal-cancel">Cancel</button>
    <button class="agent-cal-btn primary" id="agent-cal-modal-save">Save</button>
  `;

  document.getElementById('agent-cal-modal-cancel').onclick = _closeModal;
  document.getElementById('agent-cal-modal-save').onclick = () => {
    const title = document.getElementById('addTitle').value.trim();
    if (!title) { document.getElementById('addTitle').style.borderColor = '#F44336'; return; }

    const agent = document.getElementById('addAgent').value;
    const type = document.getElementById('addType').value;
    const dateVal = document.getElementById('addDate').value;
    const timeVal = document.getElementById('addTime').value;
    const dur = parseInt(document.getElementById('addDuration').value, 10) || 30;

    const s = new Date(`${dateVal}T${timeVal}:00`);
    const e = new Date(s.getTime() + dur * 60000);

    _events.push({
      id: Math.random().toString(36).slice(2, 10),
      title,
      agent,
      start: s.toISOString(),
      end: e.toISOString(),
      type,
      command: document.getElementById('addCommand').value.trim() || null,
      desc: document.getElementById('addDesc').value.trim() || null,
      allDay: type === 'execution-window',
    });
    _renderAll();
    _closeModal();
  };

  overlay.classList.add('open');
}

function _closeModal() {
  const overlay = document.getElementById('agent-cal-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ── Modal overlay init (once) ──
let _modalBuilt = false;
function _ensureModal() {
  if (_modalBuilt) return;
  _modalBuilt = true;

  const overlay = document.createElement('div');
  overlay.id = 'agent-cal-modal-overlay';
  overlay.innerHTML = `
    <div class="agent-cal-modal">
      <div class="agent-cal-modal-header"><h4 id="agent-cal-modal-title"></h4></div>
      <div class="agent-cal-modal-body" id="agent-cal-modal-body"></div>
      <div class="agent-cal-modal-actions" id="agent-cal-modal-actions"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeModal();
  });
}

// ── Open / Close ──
export function openAgentCalendar() {
  if (_open) return;
  _open = true;
  _injectStyles();
  _ensureModal();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'agent-calendar-modal';
  modal.innerHTML = `
    <div class="modal-content" style="width:900px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h4 style="position:relative;top:-2px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
          </svg>Agent Calendar
        </h4>
        <span style="flex:1"></span>
        <span id="agent-cal-count" style="font-size:11px;opacity:0.6;margin-right:12px;">0 events</span>
        <button class="close-btn" id="agent-calendar-close">✖</button>
      </div>
      <div class="modal-body" id="agent-calendar-body" style="flex:1;overflow:auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  {
    const c = modal.querySelector('.modal-content');
    const h = modal.querySelector('.modal-header');
    if (c && h) makeWindowDraggable(modal, { content: c, header: h });
  }

  document.getElementById('agent-calendar-close').addEventListener('click', closeAgentCalendar);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAgentCalendar(); });

  _escHandler = (e) => { if (e.key === 'Escape') closeAgentCalendar(); };
  document.addEventListener('keydown', _escHandler);

  // Build inner UI
  const body = document.getElementById('agent-calendar-body');
  body.innerHTML = `
    <div class="agent-cal-wrap">
      <div class="agent-cal-header">
        <button class="agent-cal-nav-btn" id="agent-cal-prev">←</button>
        <button class="agent-cal-nav-btn" id="agent-cal-today">Today</button>
        <span class="agent-cal-subtitle" id="agent-cal-subtitle">—</span>
        <button class="agent-cal-nav-btn" id="agent-cal-next">→</button>
        <div style="width:1px;height:16px;background:var(--border);margin:0 6px;"></div>
        <button class="agent-cal-view-btn" data-view="month" id="agent-cal-view-month">Month</button>
        <button class="agent-cal-view-btn" data-view="week" id="agent-cal-view-week">Week</button>
        <button class="agent-cal-view-btn" data-view="day" id="agent-cal-view-day">Day</button>
        <div style="width:1px;height:16px;background:var(--border);margin:0 6px;"></div>
        <button class="agent-cal-nav-btn" id="agent-cal-add" style="border-color:#A8E10C;color:#A8E10C;">+ Add</button>
      </div>
      <div class="agent-cal-legend" id="agent-cal-legend"></div>
      <div class="agent-cal-grid-wrap" id="agent-cal-grid"></div>
    </div>
  `;

  // Legend
  const legend = document.getElementById('agent-cal-legend');
  for (const [key, a] of Object.entries(AGENTS)) {
    const item = document.createElement('div');
    item.className = 'agent-cal-legend-item';
    item.dataset.agent = key;
    item.innerHTML = `<span class="agent-cal-dot" style="background:${a.color}"></span>${a.label}`;
    item.addEventListener('click', () => {
      if (_hiddenAgents.has(key)) {
        _hiddenAgents.delete(key);
        item.classList.remove('hidden');
      } else {
        _hiddenAgents.add(key);
        item.classList.add('hidden');
      }
      _renderAll();
    });
    legend.appendChild(item);
  }

  // View buttons
  document.getElementById('agent-cal-view-month').addEventListener('click', () => { _view = 'month'; _updateViewButtons(); _renderAll(); });
  document.getElementById('agent-cal-view-week').addEventListener('click', () => { _view = 'week'; _updateViewButtons(); _renderAll(); });
  document.getElementById('agent-cal-view-day').addEventListener('click', () => { _view = 'day'; _updateViewButtons(); _renderAll(); });

  // Nav
  document.getElementById('agent-cal-prev').addEventListener('click', () => {
    if (_view === 'month') _currentDate.setMonth(_currentDate.getMonth() - 1);
    else if (_view === 'week') _currentDate.setDate(_currentDate.getDate() - 7);
    else _currentDate.setDate(_currentDate.getDate() - 1);
    _renderAll();
  });
  document.getElementById('agent-cal-next').addEventListener('click', () => {
    if (_view === 'month') _currentDate.setMonth(_currentDate.getMonth() + 1);
    else if (_view === 'week') _currentDate.setDate(_currentDate.getDate() + 7);
    else _currentDate.setDate(_currentDate.getDate() + 1);
    _renderAll();
  });
  document.getElementById('agent-cal-today').addEventListener('click', () => {
    _currentDate = new Date();
    _renderAll();
  });
  document.getElementById('agent-cal-add').addEventListener('click', () => _openAddModal());

  // Data + render
  _events = _mockEvents();
  _updateViewButtons();
  _renderAll();

  // Count
  const countEl = document.getElementById('agent-cal-count');
  if (countEl) countEl.textContent = `${_events.length} event${_events.length !== 1 ? 's' : ''}`;
}

function _updateViewButtons() {
  document.querySelectorAll('.agent-cal-view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === _view);
  });
}

export function closeAgentCalendar() {
  if (!_open) return;
  _open = false;
  if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
  const modal = document.getElementById('agent-calendar-modal');
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

export function isAgentCalendarOpen() {
  return _open;
}
