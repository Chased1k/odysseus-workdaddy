/**
 * Agent Calendar — Standalone page for viewing agent cron jobs,
 * scheduled tasks, and execution windows.
 *
 * Currently uses mock data. Structured for future integration
 * with a real cron / task-scheduler backend endpoint.
 */

// ── Configuration ──
const AGENTS = {
  chiron:  { label: 'Chiron',  color: 'var(--chiron)',  class: 'chiron' },
  fabio:   { label: 'Fabio',   color: 'var(--fabio)',   class: 'fabio' },
  hermes:  { label: 'Hermes',  color: 'var(--hermes)',  class: 'hermes' },
};

const VIEWS = ['month', 'week', 'day'];
let _view = 'month';
let _currentDate = new Date();
let _events = [];
let _hiddenAgents = new Set();
let _modalOpen = false;

// ── Mock Data ──
// Structured for easy replacement with a real /api/agent-schedule endpoint.
// Each event has: id, title, agent, start (ISO), end (ISO), type, command?, desc?
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
    // Chiron — heartbeats, inbox checks, morning briefing
    ev('chiron', -1, 6, 30, 'Morning Briefing', 'cron', {
      command: 'morning-briefing skill',
      desc: 'Markets, AI news, schedule, urgent items, inbox cleanup.',
    }),
    ev('chiron', 0, 7, 15, 'Inbox Check — Kellen', 'scheduled', {
      command: 'check kellen@perrichase.com unread',
      desc: 'Summarize urgent emails, flag action items.',
    }),
    ev('chiron', 0, 9, 30, 'GSM Call Setup', 'scheduled', {
      command: 'gsm-call-scheduler skill',
      desc: 'Schedule weekly God, Sex & Money call on Mighty Networks + Zoom.',
    }),
    ev('chiron', 0, 14, 20, 'Inbox Check — Support', 'scheduled', {
      command: 'check support@perrichase.com unread',
    }),
    ev('chiron', 1, 6, 30, 'Morning Briefing', 'cron', {
      command: 'morning-briefing skill',
    }),
    ev('chiron', 1, 12, 45, 'MLB RAG Pipeline — Stage 4', 'scheduled', {
      command: 'Continue Qdrant setup for Perri\'s RAG pipeline',
      desc: 'Transcript cleaning → embedding → Qdrant vector DB.',
    }),
    ev('chiron', 2, 6, 30, 'Morning Briefing', 'cron', {
      command: 'morning-briefing skill',
    }),
    ev('chiron', 2, 16, 60, 'Warrior Dog — Sprint 8', 'scheduled', {
      command: 'Phaser game dev session with Scarlet',
      desc: 'Levels 2–10, outfit fixes, attack/progression.',
    }),
    ev('chiron', 3, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 4, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 5, 6, 30, 'Morning Briefing', 'cron'),
    ev('chiron', 6, 6, 30, 'Morning Briefing', 'cron'),

    // Fabio — video editing, social, community
    ev('fabio', 0, 10, 120, 'Video Review & Cut Notes', 'scheduled', {
      command: 'video-review skill',
      desc: 'Transcribe reels, extract frames, deliver cut feedback.',
    }),
    ev('fabio', 0, 15, 90, 'Canva Export Batch', 'scheduled', {
      command: 'canva skill — export designs',
      desc: 'Batch export finished designs to PNG/PDF for social.',
    }),
    ev('fabio', 1, 11, 60, 'Social Content Draft', 'scheduled', {
      command: 'Draft Instagram carousel + captions',
    }),
    ev('fabio', 2, 14, 45, 'MN Community Dossier Update', 'scheduled', {
      command: 'mn-dossier skill — member intelligence sync',
    }),
    ev('fabio', 3, 10, 120, 'Video Review & Cut Notes', 'scheduled', {
      command: 'video-review skill',
    }),
    ev('fabio', 4, 13, 60, 'Weekly Content Calendar Review', 'scheduled', {
      command: 'Review + schedule next week\'s posts',
    }),
    ev('fabio', 5, 16, 30, 'Fabio Agent Health Check', 'cron', {
      command: 'self-check: tasks, memory, logs',
    }),

    // Hermes — ops, infra, deploys
    ev('hermes', 0, 3, 15, 'Nightly Backup — Vault', 'cron', {
      command: 'rsync ~/.openclaw/workspace → backup target',
    }),
    ev('hermes', 0, 8, 20, 'Vercel Deploy — Perfect Cut', 'scheduled', {
      command: 'git push + vercel --prod',
      desc: 'Deploy The Perfect Cut app to production.',
    }),
    ev('hermes', 1, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 1, 18, 30, 'Server Health Report', 'cron', {
      command: 'healthcheck skill — system audit',
    }),
    ev('hermes', 2, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 2, 11, 45, 'SamCart Order Sync → HubSpot', 'scheduled', {
      command: 'samcart skill → hubspot update',
    }),
    ev('hermes', 3, 3, 15, 'Nightly Backup — Vault', 'cron'),
    ev('hermes', 3, 20, 30, 'OpenClaw Gateway Restart', 'scheduled', {
      command: 'openclaw gateway restart',
      desc: 'Weekly maintenance window for gateway daemon.',
    }),
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

// ── DOM refs ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ── Helpers ──
function _isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
function _addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
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

// ── Render: Month ──
function _renderMonth() {
  const grid = $('#calGrid');
  const year = _currentDate.getFullYear();
  const month = _currentDate.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = _addDays(first, -first.getDay()); // Sunday before 1st
  const end = _addDays(last, 6 - last.getDay());  // Saturday after last

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Header
  let html = `<div class="cal-month-header">`;
  for (const day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) {
    html += `<div class="cal-day-label">${day}</div>`;
  }
  html += `</div>`;

  // Cells
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
      html += `${ev.title}</div>`;
    }

    html += `</div>`;
  }

  grid.className = 'cal-month-grid';
  grid.innerHTML = html;

  _bindCellClicks(grid);
  _updateSubtitle(year, month);
}

// ── Render: Week ──
function _renderWeek() {
  const grid = $('#calGrid');
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

  // Hour rows (0–23)
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

  grid.className = 'cal-week-grid';
  grid.innerHTML = html;

  // Position events
  for (let i = 0; i < 7; i++) {
    const d = _addDays(sow, i);
    const cellEvents = _eventsForDay(d).filter(e => !_hiddenAgents.has(e.agent));
    for (const ev of cellEvents) {
      if (ev.allDay) {
        // All-day events get a banner at top — for now, render in first row
        _placeWeekEvent(ev, d, 0, true);
      } else {
        const sh = new Date(ev.start).getHours();
        _placeWeekEvent(ev, d, sh, false);
      }
    }
  }

  _bindCellClicks(grid);
  _updateSubtitleWeek(sow);
}

function _placeWeekEvent(ev, dayDate, hour, allDay) {
  const cells = $$('.cal-week-cell');
  const sow = _startOfWeek(dayDate);
  const dayIndex = Math.round((dayDate - sow) / 86400000);
  const rowIndex = allDay ? 0 : hour + 1; // +1 for header row
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
    el.style.top = `${topPct}%`;
    el.style.height = `${heightPct}%`;
    el.style.zIndex = '2';
  }
  el.textContent = ev.title;
  cell.appendChild(el);
}

// ── Render: Day ──
function _renderDay() {
  const grid = $('#calGrid');
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

  grid.className = 'cal-day-grid';
  grid.innerHTML = html;

  const cellEvents = _eventsForDay(d).filter(e => !_hiddenAgents.has(e.agent));
  for (const ev of cellEvents) {
    if (ev.allDay) {
      _placeDayEvent(ev, 0, true);
    } else {
      const sh = new Date(ev.start).getHours();
      _placeDayEvent(ev, sh, false);
    }
  }

  _bindCellClicks(grid);
  _updateSubtitleDay(d);
}

function _placeDayEvent(ev, hour, allDay) {
  const cells = $$('.cal-day-grid .cal-week-cell');
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
    el.style.top = `${topPct}%`;
    el.style.height = `${heightPct}%`;
    el.style.zIndex = '2';
  }
  el.textContent = ev.title;
  cell.appendChild(el);
}

// ── Event helpers ──
function _eventsForDay(d) {
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return _events.filter(ev => {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    // Overlap check
    return s <= end && e >= start;
  }).sort((a, b) => new Date(a.start) - new Date(b.start));
}

function _getEvent(id) {
  return _events.find(e => e.id === id);
}

// ── Bind clicks ──
function _bindCellClicks(grid) {
  grid.addEventListener('click', (e) => {
    const eventEl = e.target.closest('.cal-event');
    if (eventEl) {
      const ev = _getEvent(eventEl.dataset.id);
      if (ev) _openDetailModal(ev);
      return;
    }
    const cell = e.target.closest('.cal-month-cell, .cal-week-cell');
    if (cell && cell.dataset.date) {
      // Could open "add event" pre-filled with date
      _openAddModal(new Date(cell.dataset.date));
    }
  });
}

// ── Subtitles ──
function _updateSubtitle(year, month) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  $('#calSubtitle').textContent = `${months[month]} ${year}`;
}
function _updateSubtitleWeek(sow) {
  const eow = _addDays(sow, 6);
  const opts = { month: 'short', day: 'numeric' };
  if (sow.getFullYear() !== eow.getFullYear()) opts.year = 'numeric';
  const endOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  $('#calSubtitle').textContent = `${sow.toLocaleDateString(undefined, opts)} — ${eow.toLocaleDateString(undefined, endOpts)}`;
}
function _updateSubtitleDay(d) {
  const opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  $('#calSubtitle').textContent = d.toLocaleDateString(undefined, opts);
}

// ── Modal: Event Detail ──
function _openDetailModal(ev) {
  const a = AGENTS[ev.agent];
  $('#modalTitle').textContent = ev.title;

  let body = '';
  body += `<div class="cal-detail-row"><span class="label">Agent</span><span class="cal-detail-badge ${a.class}">${a.label}</span></div>`;
  body += `<div class="cal-detail-row"><span class="label">When</span><span>${_fmtDateRange(ev.start, ev.end)}</span></div>`;
  body += `<div class="cal-detail-row"><span class="label">Type</span><span>${ev.type}</span></div>`;
  if (ev.command) {
    body += `<div class="cal-detail-row"><span class="label">Command</span><span style="font-family:monospace;font-size:0.78rem;word-break:break-all;">${ev.command}</span></div>`;
  }
  if (ev.desc) {
    body += `<div class="cal-detail-row"><span class="label">Note</span><span>${ev.desc}</span></div>`;
  }

  $('#modalBody').innerHTML = body;
  $('#modalActions').innerHTML = `
    <button class="cal-btn" id="modalClose">Close</button>
  `;
  $('#modalClose').onclick = _closeModal;

  _showModal();
}

// ── Modal: Add Task ──
function _openAddModal(preDate) {
  $('#modalTitle').textContent = 'Add Scheduled Task';

  const dateStr = preDate ? preDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const timeStr = preDate
    ? `${String(preDate.getHours()).padStart(2, '0')}:00`
    : '09:00';

  $('#modalBody').innerHTML = `
    <div class="field">
      <label>Title</label>
      <input type="text" id="addTitle" placeholder="e.g. Morning Briefing" />
    </div>
    <div class="row">
      <div class="field">
        <label>Agent</label>
        <select id="addAgent">
          <option value="chiron">Chiron</option>
          <option value="fabio">Fabio</option>
          <option value="hermes">Hermes</option>
        </select>
      </div>
      <div class="field">
        <label>Type</label>
        <select id="addType">
          <option value="scheduled">Scheduled</option>
          <option value="cron">Cron Job</option>
          <option value="execution-window">Execution Window</option>
        </select>
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label>Date</label>
        <input type="date" id="addDate" value="${dateStr}" />
      </div>
      <div class="field">
        <label>Start Time</label>
        <input type="time" id="addTime" value="${timeStr}" />
      </div>
      <div class="field">
        <label>Duration (min)</label>
        <input type="number" id="addDuration" value="30" min="5" />
      </div>
    </div>
    <div class="field">
      <label>Command / Script</label>
      <input type="text" id="addCommand" placeholder="e.g. morning-briefing skill" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="addDesc" placeholder="What does this task do?"></textarea>
    </div>
  `;

  $('#modalActions').innerHTML = `
    <button class="cal-btn" id="modalCancel">Cancel</button>
    <button class="cal-btn primary" id="modalSave">Save</button>
  `;

  $('#modalCancel').onclick = _closeModal;
  $('#modalSave').onclick = () => {
    const title = $('#addTitle').value.trim();
    if (!title) { $('#addTitle').style.borderColor = 'var(--red)'; return; }

    const agent = $('#addAgent').value;
    const type = $('#addType').value;
    const dateVal = $('#addDate').value;
    const timeVal = $('#addTime').value;
    const dur = parseInt($('#addDuration').value, 10) || 30;

    const [hh, mm] = timeVal.split(':');
    const s = new Date(`${dateVal}T${timeVal}:00`);
    const e = new Date(s.getTime() + dur * 60000);

    const newEv = {
      id: Math.random().toString(36).slice(2, 10),
      title,
      agent,
      start: s.toISOString(),
      end: e.toISOString(),
      type,
      command: $('#addCommand').value.trim() || null,
      desc: $('#addDesc').value.trim() || null,
      allDay: type === 'execution-window',
    };

    _events.push(newEv);
    _render();
    _closeModal();
  };

  _showModal();
}

function _showModal() {
  $('#calModalOverlay').classList.add('open');
  _modalOpen = true;
}
function _closeModal() {
  $('#calModalOverlay').classList.remove('open');
  _modalOpen = false;
}

// ── Legend toggle ──
function _initLegend() {
  $('#calLegend').addEventListener('click', (e) => {
    const item = e.target.closest('.cal-legend-item');
    if (!item) return;
    const agent = item.dataset.agent;
    if (_hiddenAgents.has(agent)) {
      _hiddenAgents.delete(agent);
      item.classList.remove('hidden');
    } else {
      _hiddenAgents.add(agent);
      item.classList.add('hidden');
    }
    _render();
  });
}

// ── View toggle buttons ──
function _initViewButtons() {
  const map = { month: 'viewMonth', week: 'viewWeek', day: 'viewDay' };
  for (const [v, id] of Object.entries(map)) {
    $(`#${id}`).addEventListener('click', () => {
      _view = v;
      _render();
      _updateViewButtons();
    });
  }
}
function _updateViewButtons() {
  const map = { month: 'viewMonth', week: 'viewWeek', day: 'viewDay' };
  for (const [v, id] of Object.entries(map)) {
    $(`#${id}`).classList.toggle('active', _view === v);
  }
}

// ── Navigation ──
function _initNav() {
  $('#calPrev').addEventListener('click', () => {
    if (_view === 'month') _currentDate.setMonth(_currentDate.getMonth() - 1);
    else if (_view === 'week') _currentDate.setDate(_currentDate.getDate() - 7);
    else _currentDate.setDate(_currentDate.getDate() - 1);
    _render();
  });
  $('#calNext').addEventListener('click', () => {
    if (_view === 'month') _currentDate.setMonth(_currentDate.getMonth() + 1);
    else if (_view === 'week') _currentDate.setDate(_currentDate.getDate() + 7);
    else _currentDate.setDate(_currentDate.getDate() + 1);
    _render();
  });
  $('#calToday').addEventListener('click', () => {
    _currentDate = new Date();
    _render();
  });
}

// ── Add task button ──
function _initAddButton() {
  $('#btnAddTask').addEventListener('click', () => _openAddModal());
}

// ── Modal overlay click-to-close ──
function _initModalOverlay() {
  $('#calModalOverlay').addEventListener('click', (e) => {
    if (e.target === $('#calModalOverlay')) _closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _modalOpen) _closeModal();
  });
}

// ── Render dispatcher ──
function _render() {
  if (_view === 'month') _renderMonth();
  else if (_view === 'week') _renderWeek();
  else _renderDay();
}

// ── Future integration stub ──
// async function _fetchSchedule(start, end) {
//   const res = await fetch(`/api/agent-schedule?start=${start.toISOString()}&end=${end.toISOString()}`);
//   const data = await res.json();
//   return data.events;
// }

// ── Init ──
function init() {
  _events = _mockEvents();
  _initLegend();
  _initViewButtons();
  _updateViewButtons();
  _initNav();
  _initAddButton();
  _initModalOverlay();
  _render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
