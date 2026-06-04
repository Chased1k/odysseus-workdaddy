/**
 * Agent Dashboard — Odysseus
 * Real-time agent status cards with mock data (backend-ready)
 */

// ── Mock Data ───────────────────────────────────────────────────────────
const MOCK_AGENTS = [
  {
    id: 'chiron',
    name: 'Chiron',
    initials: 'CH',
    role: 'Main Orchestrator',
    status: 'online',
    model: 'kimi-k2.6',
    modelDisplay: 'Kimi K2.6',
    lastActive: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
    recentActions: [
      { icon: '💬', text: 'Processed chat message', time: '2m ago' },
      { icon: '📅', text: 'Checked calendar events', time: '5m ago' },
      { icon: '📧', text: 'Scanned inbox (3 unread)', time: '12m ago' },
      { icon: '🔧', text: 'Executed shell command', time: '18m ago' },
    ],
    stats: {
      totalActions: 1247,
      uptime: '4d 12h',
      tokensUsed: '2.4M',
    },
    activity: [30, 45, 60, 80, 55, 40, 70, 90, 65, 50, 75, 85, 40, 60, 70, 55, 80, 95, 60, 45, 70, 85, 50, 65],
  },
  {
    id: 'fabio',
    name: 'Fabio',
    initials: 'FB',
    role: "Perri's Agent",
    status: 'online',
    model: 'claude-sonnet-4',
    modelDisplay: 'Claude 4 Sonnet',
    lastActive: new Date(Date.now() - 8 * 60 * 1000), // 8 min ago
    recentActions: [
      { icon: '📧', text: 'Replied to coaching inquiry', time: '8m ago' },
      { icon: '📝', text: 'Drafted newsletter copy', time: '22m ago' },
      { icon: '🎥', text: 'Reviewed video transcript', time: '1h ago' },
    ],
    stats: {
      totalActions: 892,
      uptime: '2d 8h',
      tokensUsed: '1.1M',
    },
    activity: [20, 35, 50, 40, 30, 25, 45, 60, 55, 40, 30, 50, 60, 45, 35, 40, 55, 70, 45, 30, 50, 40, 35, 45],
  },
  {
    id: 'hermes',
    name: 'Hermes',
    initials: 'HM',
    role: 'Messenger / Notifications',
    status: 'busy',
    model: 'gpt-4o-mini',
    modelDisplay: 'GPT-4o Mini',
    lastActive: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    recentActions: [
      { icon: '📨', text: 'Sent GSM call reminder', time: '45m ago' },
      { icon: '🔔', text: 'Delivered morning briefing', time: '3h ago' },
      { icon: '📱', text: 'Pushed Telegram alert', time: '5h ago' },
    ],
    stats: {
      totalActions: 356,
      uptime: '1d 4h',
      tokensUsed: '420K',
    },
    activity: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35],
  },
];

// ── Utilities ─────────────────────────────────────────────────────────
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function statusLabel(status) {
  const map = { online: 'Online', offline: 'Offline', busy: 'Busy' };
  return map[status] || status;
}

// ── Render ──────────────────────────────────────────────────────────────
function renderAgentCard(agent) {
  const recentActionsHtml = agent.recentActions
    .map(
      (a) => `
      <div class="agent-action-item">
        <span class="agent-action-icon">${a.icon}</span>
        <span>${a.text}</span>
        <span class="agent-action-time">${a.time}</span>
      </div>
    `
    )
    .join('');

  const activityBars = agent.activity
    .map((h) => `<div class="activity-bar" style="height:${h}%"></div>`)
    .join('');

  return `
    <article class="agent-card" data-agent-id="${agent.id}">
      <div class="agent-card-header">
        <div class="agent-avatar-wrap">
          <div class="agent-avatar --${agent.id}">${agent.initials}</div>
          <div class="agent-name-block">
            <h3 class="agent-name">${agent.name}</h3>
            <span class="agent-role">${agent.role}</span>
          </div>
        </div>
        <div class="agent-status-pill">
          <span class="status-dot ${agent.status}"></span>
          <span>${statusLabel(agent.status)}</span>
        </div>
      </div>

      <div class="agent-stats">
        <div class="agent-stat">
          <span class="agent-stat-label">Model</span>
          <span class="agent-stat-value accent">${agent.modelDisplay}</span>
        </div>
        <div class="agent-stat">
          <span class="agent-stat-label">Last Active</span>
          <span class="agent-stat-value">${formatRelativeTime(agent.lastActive)}</span>
        </div>
        <div class="agent-stat">
          <span class="agent-stat-label">Actions (24h)</span>
          <span class="agent-stat-value">${agent.stats.totalActions.toLocaleString()}</span>
        </div>
        <div class="agent-stat">
          <span class="agent-stat-label">Uptime</span>
          <span class="agent-stat-value">${agent.stats.uptime}</span>
        </div>
      </div>

      <div class="agent-activity-mini" title="Activity over last 24 hours (hourly)">
        ${activityBars}
      </div>

      <div class="agent-recent-actions">
        <div class="agent-recent-actions-label">Recent Actions</div>
        ${recentActionsHtml}
      </div>
    </article>
  `;
}

function renderAddAgentCard() {
  return `
    <button class="add-agent-card" id="btn-add-agent" type="button">
      <div class="add-agent-icon">+</div>
      <span class="add-agent-label">Add Agent</span>
      <span class="add-agent-hint">Deploy a new AI assistant</span>
    </button>
  `;
}

function renderDashboard() {
  const grid = document.getElementById('agent-grid');
  if (!grid) return;

  const cardsHtml = MOCK_AGENTS.map(renderAgentCard).join('');
  grid.innerHTML = cardsHtml + renderAddAgentCard();

  // Update count badge
  const badge = document.getElementById('agent-count');
  if (badge) badge.textContent = `${MOCK_AGENTS.length} agent${MOCK_AGENTS.length !== 1 ? 's' : ''}`;

  // Wire click on agent cards (placeholder navigation)
  grid.querySelectorAll('.agent-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.agentId;
      console.log(`[AgentDashboard] Open agent detail: ${id}`);
      // Future: router.push(`/agents/${id}`)
    });
  });

  // Wire add-agent button
  const addBtn = document.getElementById('btn-add-agent');
  if (addBtn) addBtn.addEventListener('click', openModal);
}

// ── Modal ───────────────────────────────────────────────────────────────
const modal = document.getElementById('add-agent-modal');
const form = document.getElementById('add-agent-form');

function openModal() {
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus first input
  setTimeout(() => document.getElementById('agent-name')?.focus(), 50);
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  form?.reset();
}

function handleSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('agent-name')?.value.trim();
  const model = document.getElementById('agent-model')?.value;
  const role = document.getElementById('agent-role')?.value;
  const systemPrompt = document.getElementById('agent-system-prompt')?.value.trim();

  if (!name || !model || !role) return;

  // Create new agent object
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const initials = name.slice(0, 2).toUpperCase();

  const newAgent = {
    id,
    name,
    initials,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    status: 'online',
    model,
    modelDisplay: model,
    lastActive: new Date(),
    recentActions: [{ icon: '✨', text: 'Agent created', time: 'Just now' }],
    stats: { totalActions: 0, uptime: '0m', tokensUsed: '0' },
    activity: Array(24).fill(0),
  };

  MOCK_AGENTS.push(newAgent);
  renderDashboard();
  closeModal();

  console.log('[AgentDashboard] Created agent:', newAgent);
}

// ── Real-time Simulation ────────────────────────────────────────────────
function simulateLiveUpdates() {
  // Randomly update "last active" times so the dashboard feels alive
  setInterval(() => {
    const randomAgent = MOCK_AGENTS[Math.floor(Math.random() * MOCK_AGENTS.length)];
    if (Math.random() > 0.7) {
      randomAgent.lastActive = new Date();
      // Occasionally add a new action
      if (Math.random() > 0.5) {
        const actions = [
          { icon: '💬', text: 'Processed chat message' },
          { icon: '📅', text: 'Checked calendar' },
          { icon: '📧', text: 'Scanned inbox' },
          { icon: '🔧', text: 'Ran shell command' },
          { icon: '📝', text: 'Drafted response' },
          { icon: '🔍', text: 'Web search query' },
        ];
        const action = actions[Math.floor(Math.random() * actions.length)];
        randomAgent.recentActions.unshift({ ...action, time: 'Just now' });
        if (randomAgent.recentActions.length > 4) randomAgent.recentActions.pop();
        randomAgent.stats.totalActions++;
      }
      // Update one random activity bar
      const idx = Math.floor(Math.random() * 24);
      randomAgent.activity[idx] = Math.min(100, randomAgent.activity[idx] + Math.floor(Math.random() * 15));

      renderDashboard();
    }
  }, 8000);
}

// ── Initialization ──────────────────────────────────────────────────────
function init() {
  renderDashboard();

  // Modal events
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  form?.addEventListener('submit', handleSubmit);

  // ESC to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      closeModal();
    }
  });

  // Live updates
  simulateLiveUpdates();

  console.log('[AgentDashboard] Initialized with', MOCK_AGENTS.length, 'agents');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
