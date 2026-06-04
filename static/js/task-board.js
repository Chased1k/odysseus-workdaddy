/**
 * Task Board — Kanban view with Linear API integration
 * Fetches real Linear issues and maps them to Kanban columns.
 */

const COLUMNS = [
  { id: 'todo',        label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];

// Tasks loaded from Linear API
let tasks = [];
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

// ================== LINEAR API ==================

async function loadLinearIssues(team = 'TEA') {
  try {
    const statusEl = document.getElementById('linear-status');
    if (statusEl) statusEl.textContent = '● Linear: Loading...';
    
    const resp = await fetch(`/api/linear/issues?team=${team}&limit=50`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    tasks = data.issues || [];
    
    if (statusEl) statusEl.textContent = `● Linear: ${tasks.length} tasks`;
    
    // Populate assignee filter
    populateAssigneeFilter();
    
    renderBoard();
  } catch (err) {
    console.error('Linear API error:', err);
    const statusEl = document.getElementById('linear-status');
    if (statusEl) {
      statusEl.textContent = '● Linear: Error';
      statusEl.style.color = '#ff4d4d';
    }
    // Fallback to mock data if API fails
    tasks = getMockTasks();
    renderBoard();
  }
}

function populateAssigneeFilter() {
  const filter = document.getElementById('filter-assignee');
  if (!filter) return;
  
  // Get unique assignees
  const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))].sort();
  
  // Save current selection
  const current = filter.value;
  
  // Rebuild options
  filter.innerHTML = '<option value="">All assignees</option>';
  assignees.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    filter.appendChild(opt);
  });
  
  // Restore selection if still valid
  if (current && assignees.includes(current)) {
    filter.value = current;
  }
}

function getMockTasks() {
  return [
    { id: 'WD-101', title: 'Design landing hero section',     assignee: 'Chiron',   priority: 'High',   column: 'todo',       due_date: '2026-06-06', description: '', labels: [] },
    { id: 'WD-102', title: 'Set up Qdrant vector DB',           assignee: 'Chiron',   priority: 'Medium', column: 'in-progress', due_date: '2026-06-05', description: '', labels: [] },
    { id: 'WD-103', title: 'Build OAuth flow for Gmail',        assignee: 'Hermes',   priority: 'High',   column: 'review',     due_date: '2026-06-04', description: '', labels: [] },
    { id: 'WD-104', title: 'Fix mobile nav z-index bug',        assignee: 'Hermes',   priority: 'Low',    column: 'done',       due_date: '2026-06-01', description: '', labels: [] },
    { id: 'WD-105', title: 'Write Playwright E2E tests',        assignee: 'Chiron',   priority: 'Medium', column: 'todo',       due_date: '2026-06-08', description: '', labels: [] },
    { id: 'WD-106', title: 'Linear API schema mapping',         assignee: 'Chiron',   priority: 'Low',    column: 'in-progress', due_date: '2026-06-10', description: '', labels: [] },
    { id: 'WD-107', title: 'Dark-mode toggle persistence',      assignee: 'Hermes',   priority: 'Medium', column: 'review',     due_date: '2026-06-03', description: '', labels: [] },
    { id: 'WD-108', title: 'Onboarding tooltip tour',           assignee: 'Hermes',   priority: 'Low',    column: 'todo',       due_date: '2026-06-12', description: '', labels: [] },
  ];
}

// ================== RENDERING ==================

function renderBoard() {
  if (!$board) return;
  $board.innerHTML = '';

  COLUMNS.forEach(col => {
    const colTasks = tasks.filter(t => (t.column || t.status) === col.id);
    
    const $col = document.createElement('div');
    $col.className = 'task-column';
    $col.dataset.column = col.id;
    $col.innerHTML = `
      <div class="task-column-header">
        ${col.label}
        <span class="count">${colTasks.length}</span>
      </div>
      <div class="task-column-body" data-column="${col.id}">
        ${colTasks.map(t => taskCard(t)).join('')}
      </div>
    `;
    
    // Drop handlers
    const dropzone = $col.querySelector('.task-column-body');
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('drop', handleDrop);
    dropzone.addEventListener('dragenter', handleDragEnter);
    dropzone.addEventListener('dragleave', handleDragLeave);
    
    $board.appendChild($col);
  });

  // Re-attach drag handlers to cards
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('click', () => openEditModal(card.dataset.id));
  });
}

function taskCard(t) {
  const priorityClass = {
    'Critical': 'priority-critical',
    'Urgent': 'priority-urgent',
    'High': 'priority-high',
    'Medium': 'priority-medium',
    'Low': 'priority-low',
  }[t.priority] || 'priority-low';

  const assignee = t.assignee || 'Unassigned';
  const due = t.due_date ? formatDate(t.due_date) : '';
  const labels = (t.labels || []).map(l => `<span class="task-label">${l}</span>`).join('');
  
  return `
    <div class="task-card ${priorityClass}" draggable="true" data-id="${t.id}">
      <div class="task-priority-bar"></div>
      <div class="task-id">${t.id}</div>
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta">
        <span class="task-assignee">${assignee}</span>
        ${due ? `<span class="task-due">${due}</span>` : ''}
      </div>
      ${labels ? `<div class="task-labels">${labels}</div>` : ''}
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ================== DRAG & DROP ==================

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  this.classList.add('dragging');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.kanban-dropzone').forEach(z => z.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  const taskId = e.dataTransfer.getData('text/plain');
  const newColumn = this.dataset.column;
  
  const task = tasks.find(t => t.id === taskId);
  if (!task || task.column === newColumn) return;
  
  // Update local state
  task.column = newColumn;
  task.status = newColumn;
  
  // Try to update Linear via API
  if (task.linear_id) {
    try {
      await fetch(`/api/linear/issues/${task.linear_id}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newColumn })
      });
    } catch (err) {
      console.error('Failed to update Linear state:', err);
    }
  }
  
  renderBoard();
}

// ================== MODAL ==================

function openAddModal() {
  editingId = null;
  $modalTitle.textContent = 'Add Task';
  $tTitle.value = '';
  $tDesc.value = '';
  $tAssignee.value = '';
  $tPriority.value = 'medium';
  $tStatus.value = 'todo';
  $tDue.value = '';
  $modal.style.display = 'block';
}

function openEditModal(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  
  editingId = id;
  $modalTitle.textContent = 'Edit Task';
  $tTitle.value = t.title;
  $tDesc.value = t.description || '';
  $tAssignee.value = t.assignee || '';
  $tPriority.value = (t.priority || 'medium').toLowerCase();
  $tStatus.value = t.column || t.status || 'todo';
  $tDue.value = t.due_date || '';
  $modal.style.display = 'block';
}

function closeModal() {
  $modal.style.display = 'none';
  editingId = null;
}

function saveTask() {
  const taskData = {
    title: $tTitle.value.trim(),
    description: $tDesc.value.trim(),
    assignee: $tAssignee.value.trim(),
    priority: $tPriority.value,
    column: $tStatus.value,
    status: $tStatus.value,
    due_date: $tDue.value,
  };
  
  if (!taskData.title) return;
  
  if (editingId) {
    const t = tasks.find(x => x.id === editingId);
    if (t) Object.assign(t, taskData);
  } else {
    const newId = `WD-${100 + tasks.length + 1}`;
    tasks.push({ id: newId, ...taskData, labels: [] });
  }
  
  closeModal();
  renderBoard();
}

// ================== EVENTS ==================

if ($filter) {
  $filter.addEventListener('change', () => {
    filterAssignee = $filter.value;
    renderBoard();
  });
}

if ($btnAdd)     $btnAdd.addEventListener('click', openAddModal);
if ($btnSave)    $btnSave.addEventListener('click', saveTask);
if ($btnCancel)  $btnCancel.addEventListener('click', closeModal);

// Close modal on outside click
if ($modal) {
  $modal.addEventListener('click', (e) => {
    if (e.target === $modal) closeModal();
  });
}

// ================== INIT ==================

// Load real Linear data on page load
loadLinearIssues('TEA');
