/**
 * Task Board — Kanban board with Linear API integration
 * Follows Odysseus modal pattern (see tasks.js)
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _tasks = [];
let _tasksFetched = false;
let _escHandler = null;

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

// Phase 1: mock fallback if API unreachable
function _mockTasks() {
  return [
    { id:'TEA-66', title:'Fix Ollama 8K output cap', state:'Done', priority:2, assignee:'Chiron', due:'2026-04-13' },
    { id:'TEA-67', title:'PR to openclaw for max_tokens fix', state:'In Progress', priority:3, assignee:'Chiron', due:'2026-04-20' },
    { id:'TEA-73', title:'Brain dump research: TDAB', state:'Backlog', priority:1, assignee:null, due:null },
    { id:'TEA-82', title:'Build Hephaestus CTO agent workspace', state:'In Progress', priority:2, assignee:'Fabio', due:'2026-05-01' },
    { id:'WD-54', title:'Fabio OAuth Gmail setup', state:'Done', priority:2, assignee:'Fabio', due:'2026-04-29' },
    { id:'WD-55', title:'Fabio Email Responder skill', state:'In Progress', priority:3, assignee:'Fabio', due:'2026-05-05' },
    { id:'WD-58', title:'Move Perri off Telegram', state:'Backlog', priority:1, assignee:null, due:null },
    { id:'TEA-43', title:'Permission Studios storage build', state:'Review', priority:2, assignee:'Hermes', due:'2026-04-15' }
  ];
}

async function _fetchTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/linear/issues`, { credentials:'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _tasks = data.issues || data.tasks || [];
  } catch (e) {
    console.warn('Linear fetch failed, using mock:', e.message);
    _tasks = _mockTasks();
  }
  _tasksFetched = true;
}

function _esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function _render() {
  const body = document.getElementById('task-board-body');
  if (!body) return;
  if (!_tasksFetched) { body.innerHTML='<div style="opacity:0.4;font-size:12px;text-align:center;padding:40px 0;">Loading tasks...</div>'; return; }

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:10px;overflow-x:auto;padding:8px;height:100%;';

  for (const col of COLUMNS) {
    const colTasks = _tasks.filter(t => t.state===col || t.column===col);
    const colDiv = document.createElement('div');
    colDiv.style.cssText = 'flex:1;min-width:220px;max-width:320px;display:flex;flex-direction:column;gap:8px;';

    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;padding:0 4px 4px;display:flex;align-items:center;gap:6px;';
    hdr.innerHTML = `${col} <span style="background:var(--bg);padding:2px 6px;border-radius:10px;font-size:10px;">${colTasks.length}</span>`;
    colDiv.appendChild(hdr);

    const dz = document.createElement('div');
    dz.style.cssText = 'flex:1;min-height:100px;background:var(--bg);border-radius:6px;padding:6px;display:flex;flex-direction:column;gap:6px;transition:background 0.2s;';
    dz.dataset.column = col;

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.style.opacity='0.7'; });
    dz.addEventListener('dragleave', () => { dz.style.opacity='1'; });
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.style.opacity='1'; _moveTask(e.dataTransfer.getData('text/plain'), col); });

    for (const t of colTasks) {
      const pc = t.priority>=3 ? '#F9EBDC' : t.priority===2 ? '#A8E10C' : '#B2EAEA';
      const card = document.createElement('div');
      card.draggable = true;
      card.style.cssText = 'background:var(--panel-bg,#1A1A1A);border:1px solid var(--border);border-radius:6px;padding:10px;cursor:grab;font-size:12px;';
      card.dataset.id = t.id || t.identifier;
      card.innerHTML = `
        <div style="display:flex;align-items:start;gap:6px;margin-bottom:6px;">
          <span style="font-family:monospace;font-size:10px;opacity:0.5;flex-shrink:0;">${_esc(t.id||t.identifier||'')}</span>
          <span style="width:6px;height:6px;border-radius:50%;background:${pc};flex-shrink:0;margin-top:4px;"></span>
        </div>
        <div style="font-weight:500;margin-bottom:6px;line-height:1.4;">${_esc(t.title||t.name||'')}</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:10px;opacity:0.6;">
          <span>👤 ${_esc(t.assignee||'Unassigned')}</span>
          ${t.due ? `<span>📅 ${t.due}</span>` : ''}
        </div>
      `;
      card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', card.dataset.id); card.style.opacity='0.5'; });
      card.addEventListener('dragend', () => { card.style.opacity='1'; });
      dz.appendChild(card);
    }

    colDiv.appendChild(dz);
    wrap.appendChild(colDiv);
  }

  body.innerHTML = '';
  body.appendChild(wrap);
}

async function _moveTask(taskId, newState) {
  const t = _tasks.find(x => (x.id||x.identifier)===taskId);
  if (!t) return;
  t.state = newState; t.column = newState;
  _render();
  try {
    await fetch(`${API_BASE}/api/linear/issues/${taskId}/state`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({state:newState}) });
  } catch (e) { console.warn('Linear sync failed:', e); }
}

export function openTaskBoard() {
  if (_open) return;
  _open = true;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'task-board-modal';
  modal.innerHTML = `
    <div class="modal-content" style="width:900px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h4 style="position:relative;top:-2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>Task Board</h4>
        <span style="flex:1"></span>
        <span id="task-board-status" style="font-size:11px;opacity:0.6;margin-right:12px;">● Linear</span>
        <button class="close-btn" id="task-board-close">✖</button>
      </div>
      <div class="modal-body" id="task-board-body" style="flex:1;overflow:auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  { const c=modal.querySelector('.modal-content'), h=modal.querySelector('.modal-header'); if(c&&h) makeWindowDraggable(modal,{content:c,header:h}); }

  document.getElementById('task-board-close').addEventListener('click', closeTaskBoard);
  modal.addEventListener('click', (e) => { if(e.target===modal) closeTaskBoard(); });

  _escHandler = (e) => { if(e.key==='Escape') closeTaskBoard(); };
  document.addEventListener('keydown', _escHandler);

  _fetchTasks().then(() => {
    _render();
    const s = document.getElementById('task-board-status');
    if (s && _tasks.length>0 && _tasks[0].id && !_tasks[0].id.startsWith('TEA-')) {
      s.textContent = '● Linear Live'; s.style.color = '#A8E10C';
    }
  });
}

export function closeTaskBoard() {
  if (!_open) return;
  _open = false;
  if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler=null; }
  const modal = document.getElementById('task-board-modal');
  if (modal) {
    const c = modal.querySelector('.modal-content');
    if (c) { c.classList.add('modal-closing'); c.addEventListener('animationend',()=>modal.remove(),{once:true}); setTimeout(()=>{if(modal.parentElement)modal.remove();},250); }
    else modal.remove();
  }
}

export function isTaskBoardOpen() { return _open; }