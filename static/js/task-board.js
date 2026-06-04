/**
 * Task Board — Kanban view for Odysseus
 * Structured for later Linear API integration.
 */

const COLUMNS = [
  { id: 'todo',       label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review',     label: 'Review' },
  { id: 'done',       label: 'Done' },
];

const AGENTS = [
  { id: 'chiron',   name: 'Chiron',   avatar: 'C' },
  { id: 'odysseus', name: 'Odysseus', avatar: 'O' },
  { id: 'hermes',   name: 'Hermes',   avatar: 'H' },
  { id: 'athena',   name: 'Athena',   avatar: 'A' },
];

// Mock data — keyed by Linear-style identifiers for future API mapping
let tasks = [
  { id: 'WD-101', title: 'Design landing hero section',     assignee: 'chiron',   priority: 'high',   status: 'todo',       due: '2026-06-06', description: '' },
  { id: 'WD-102', title: 'Set up Qdrant vector DB',           assignee: 'odysseus', priority: 'medium', status: 'in_progress', due: '2026-06-05', description: '' },
  { id: 'WD-103', title: 'Build OAuth flow for Gmail',        assignee: 'hermes',   priority: 'high',   status: 'review',     due: '2026-06-04', description: '' },
  { id: 'WD-104', title: 'Fix mobile nav z-index bug',        assignee: 'athena',   priority: 'low',    status: 'done',       due: '2026-06-01', description: '' },
  { id: 'WD-105', title: 'Write Playwright E2E tests',        assignee: 'chiron',   priority: 'medium', status: 'todo',       due: '2026-06-08', description: '' },
  { id: 'WD-106', title: 'Linear API schema mapping',         assignee: 'odysseus', priority: 'low',    status: 'in_progress', due: '2026-06-10', description: '' },
  { id: 'WD-107', title: 'Dark-mode toggle persistence',      assignee: 'athena',   priority: 'medium', status: 'review',     due: '2026-06-03', description: '' },
  { id: 'WD-108', title: 'Onboarding tooltip tour',           assignee: 'hermes',   priority: 'low',    status: 'todo',       due: '2026-06-12', description: '' },
];

let filterAssignee = '';
let dragSrcEl = null;

const $board      = document.getElementById('board');
const $filter     = document.getElementById('filter-assignee');
const $btnAdd     = document.getElementById('btn-add-task');
const $modal      = document.getElementById('task-modal');
const $modalTitle = document.getElementById('modal-title');
const $tTitle     = document.getElementById('t-title');
const $tDesc      = document.getElementById('t-desc');
const $tAssignee  = document.getElementById('t-assignee');
const $tPriority  = document.getElementById('t-priority');
const $tStatus    = document.getElementById('t-status');
const $tDue       = document.getElementById('t-due');
const $btnSave    = document.getElementById('modal-save');
const $btnCancel  = document.getElementById('modal-cancel');

let editingId = null;

/* ── Init ── */
function init() {
  populateFilters();
  renderBoard();
  bindEvents();
}

function populateFilters() {
  $filter.innerHTML = '<option value="">All assignees</option>';
  AGENTS.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    $filter.appendChild(opt);
  });

  $tAssignee.innerHTML = '';
  AGENTS.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    $tAssignee.appendChild(opt);
  });
}

/* ── Rendering ── */
function renderBoard() {
  $board.innerHTML = '';

  COLUMNS.forEach(col => {
    const colTasks = tasks
      .filter(t => t.status === col.id)
      .filter(t => !filterAssignee || t.assignee === filterAssignee);

    const $col = document.createElement('div');
    $col.className = 'task-column';
    $col.dataset.status = col.id;
    $col.innerHTML = `
      <div class="task-column-header">
        <span>${col.label}</span>
        <span class="count">${colTasks.length}</span>
      </div>
      <div class="task-column-body" data-status="${col.id}"></div>
    `;

    const $body = $col.querySelector('.task-column-body');
    colTasks.forEach(task => $body.appendChild(renderCard(task)));

    setupDropZone($body);
    $board.appendChild($col);
  });
}

function renderCard(task) {
  const agent = AGENTS.find(a => a.id === task.assignee) || { name: 'Unassigned', avatar: '?' };
  const dueClass = dueClassFor(task.due);
  const dueLabel = fmtDate(task.due);

  const $card = document.createElement('div');
  $card.className = 'task-card';
  $card.draggable = true;
  $card.dataset.id = task.id;
  $card.innerHTML = `
    <div class="task-card-top">
      <span class="task-priority ${task.priority}">${task.priority}</span>
      <span style="font-size:0.7rem;color:#FAAFCC">${task.id}</span>
    </div>
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="task-assignee">
        <span class="task-assignee-avatar">${agent.avatar}</span>
        ${agent.name}
      </span>
      <span class="task-due ${dueClass}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${dueLabel}
      </span>
    </div>
  `;

  // Drag events
  $card.addEventListener('dragstart', e => {
    dragSrcEl = $card;
    $card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  $card.addEventListener('dragend', () => {
    $card.classList.remove('dragging');
    dragSrcEl = null;
    document.querySelectorAll('.task-column-body').forEach(b => b.classList.remove('drag-over'));
  });

  // Click to edit
  $card.addEventListener('click', () => openEdit(task.id));

  return $card;
}

function setupDropZone($body) {
  $body.addEventListener('dragover', e => {
    e.preventDefault();
    $body.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  });
  $body.addEventListener('dragleave', () => $body.classList.remove('drag-over'));
  $body.addEventListener('drop', e => {
    e.preventDefault();
    $body.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = $body.dataset.status;
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      renderBoard();
      // TODO: sync to Linear API here
    }
  });
}

/* ── Modal ── */
function openNew() {
  editingId = null;
  $modalTitle.textContent = 'New Task';
  $tTitle.value = '';
  $tDesc.value = '';
  $tAssignee.value = AGENTS[0].id;
  $tPriority.value = 'medium';
  $tStatus.value = 'todo';
  $tDue.value = '';
  $modal.classList.add('open');
  $tTitle.focus();
}

function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  $modalTitle.textContent = `Edit ${id}`;
  $tTitle.value = task.title;
  $tDesc.value = task.description || '';
  $tAssignee.value = task.assignee;
  $tPriority.value = task.priority;
  $tStatus.value = task.status;
  $tDue.value = task.due || '';
  $modal.classList.add('open');
}

function closeModal() {
  $modal.classList.remove('open');
  editingId = null;
}

function saveTask() {
  const title = $tTitle.value.trim();
  if (!title) return alert('Title is required');

  const payload = {
    title,
    description: $tDesc.value.trim(),
    assignee: $tAssignee.value,
    priority: $tPriority.value,
    status: $tStatus.value,
    due: $tDue.value || null,
  };

  if (editingId) {
    const task = tasks.find(t => t.id === editingId);
    Object.assign(task, payload);
  } else {
    const nextId = nextTaskId();
    tasks.push({ id: nextId, ...payload });
  }

  renderBoard();
  closeModal();
  // TODO: sync to Linear API here
}

function nextTaskId() {
  const nums = tasks.map(t => parseInt(t.id.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `WD-${max + 1}`;
}

/* ── Helpers ── */
function dueClassFor(dateStr) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  const diff = Math.floor((d - today) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 2) return 'soon';
  return '';
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── Events ── */
function bindEvents() {
  $filter.addEventListener('change', () => {
    filterAssignee = $filter.value;
    renderBoard();
  });

  $btnAdd.addEventListener('click', openNew);
  $btnCancel.addEventListener('click', closeModal);
  $btnSave.addEventListener('click', saveTask);

  $modal.addEventListener('click', e => {
    if (e.target === $modal) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $modal.classList.contains('open')) closeModal();
  });
}

/* ── Linear API stubs (future) ── */
// async function fetchLinearTasks() { … }
// async function createLinearTask(payload) { … }
// async function updateLinearTask(id, payload) { … }

/* ── Boot ── */
init();
