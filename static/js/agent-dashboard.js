/**
 * Agent Dashboard — floating modal showing agent status cards
 * Follows Odysseus modal pattern (see tasks.js)
 */

import { makeWindowDraggable } from './windowDrag.js';

const API_BASE = window.location.origin;
let _open = false;
let _agents = [];
let _agentsFetched = false;
let _pollInterval = null;

// Phase 1: mock data — replace with real API in Phase 2
const _mockAgents = [
  { id:'chiron', name:'Chiron', role:'Orchestrator', status:'online', model:'kimi-k2.6:cloud', host:'Watchtower', uptime:'3d 7h', tasksToday:12, tasksDone:8, lastAction:'Linear API integration', lastActionTime:'2 min ago', color:'#A8E10C' },
  { id:'fabio',  name:'Fabio',  role:'Perri\'s Agent', status:'online', model:'glm-5.1:cloud', host:'fabio-test-gateway', uptime:'1d 14h', tasksToday:5, tasksDone:3, lastAction:'Email responder v3 test', lastActionTime:'15 min ago', color:'#FAAFCC' },
  { id:'hermes', name:'Hermes', role:'Knowledge Worker', status:'idle', model:'llama3.3:70b', host:'Hermes container', uptime:'0d 4h', tasksToday:0, tasksDone:0, lastAction:'Waiting for tasks', lastActionTime:'—', color:'#B2EAEA' }
];

async function _fetchAgents() {
  _agents = [..._mockAgents];
  _agentsFetched = true;
}

function _esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function _render() {
  const body = document.getElementById('agent-dashboard-body');
  if (!body) return;
  if (!_agentsFetched) { body.innerHTML='<div style="opacity:0.4;font-size:12px;text-align:center;padding:40px 0;">Loading agents...</div>'; return; }
  if (!_agents.length) { body.innerHTML='<div style="opacity:0.4;font-size:12px;text-align:center;padding:40px 0;">No agents configured.</div>'; return; }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:8px;';

  for (const a of _agents) {
    const dot = a.status==='online' ? '🟢' : a.status==='idle' ? '⚪' : '🔴';
    const card = document.createElement('div');
    card.style.cssText = `background:var(--panel-bg,#1A1A1A);border:1px solid ${a.color}44;border-radius:8px;padding:14px;`;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${a.color}22;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid ${a.color}44;">${a.name[0]}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;">${_esc(a.name)}</div>
          <div style="font-size:11px;opacity:0.6;">${_esc(a.role)}</div>
        </div>
        <div style="font-size:11px;opacity:0.7;">${dot} ${a.status}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;margin-bottom:10px;">
        <div style="background:var(--bg);padding:6px 8px;border-radius:4px;"><div style="opacity:0.5;margin-bottom:2px;">Model</div><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(a.model)}</div></div>
        <div style="background:var(--bg);padding:6px 8px;border-radius:4px;"><div style="opacity:0.5;margin-bottom:2px;">Host</div><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(a.host)}</div></div>
        <div style="background:var(--bg);padding:6px 8px;border-radius:4px;"><div style="opacity:0.5;margin-bottom:2px;">Uptime</div><div style="font-weight:500;">${a.uptime}</div></div>
        <div style="background:var(--bg);padding:6px 8px;border-radius:4px;"><div style="opacity:0.5;margin-bottom:2px;">Tasks Today</div><div style="font-weight:500;">${a.tasksDone}/${a.tasksToday}</div></div>
      </div>
      <div style="font-size:11px;opacity:0.7;padding-top:6px;border-top:1px solid var(--border);"><span style="opacity:0.5;">Last:</span> ${_esc(a.lastAction)} · ${a.lastActionTime}</div>
    `;
    grid.appendChild(card);
  }
  body.innerHTML = '';
  body.appendChild(grid);
}

export function openAgentDashboard() {
  if (_open) return;
  _open = true;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'agent-dashboard-modal';
  modal.innerHTML = `
    <div class="modal-content" style="width:700px;max-width:90vw;max-height:80vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h4 style="position:relative;top:-2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px"><circle cx="12" cy="7" r="5"/><path d="M17 22H7"/><path d="M12 17v5"/></svg>Agents</h4>
        <span style="flex:1"></span>
        <span id="agent-count" style="font-size:12px;opacity:0.6;margin-right:12px;">0 agents</span>
        <button class="close-btn" id="agent-dashboard-close">✖</button>
      </div>
      <div class="modal-body" id="agent-dashboard-body" style="flex:1;overflow:auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  { const c=modal.querySelector('.modal-content'), h=modal.querySelector('.modal-header'); if(c&&h) makeWindowDraggable(modal,{content:c,header:h}); }

  document.getElementById('agent-dashboard-close').addEventListener('click', closeAgentDashboard);
  modal.addEventListener('click', (e) => { if(e.target===modal) closeAgentDashboard(); });

  _fetchAgents().then(() => {
    _render();
    const el = document.getElementById('agent-count');
    if (el) el.textContent = `${_agents.length} agent${_agents.length!==1?'s':''}`;
  });

  _pollInterval = setInterval(async () => { await _fetchAgents(); _render(); }, 30000);
}

export function closeAgentDashboard() {
  if (!_open) return;
  _open = false;
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval=null; }
  const modal = document.getElementById('agent-dashboard-modal');
  if (modal) {
    const c = modal.querySelector('.modal-content');
    if (c) { c.classList.add('modal-closing'); c.addEventListener('animationend',()=>modal.remove(),{once:true}); setTimeout(()=>{if(modal.parentElement)modal.remove();},250); }
    else modal.remove();
  }
}

export function isAgentDashboardOpen() { return _open; }