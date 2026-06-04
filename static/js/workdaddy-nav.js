/**
 * Work Daddy Navigation — shared across all standalone pages
 * Adds a consistent nav bar to Agent Dashboard, Task Board, Calendar, Chat, Memory Browser
 */

(function() {
  const PAGES = [
    { id: 'agents',   label: '🤖 Agents',   url: '/static/agent-dashboard.html' },
    { id: 'tasks',    label: '📋 Tasks',    url: '/static/task-board.html' },
    { id: 'calendar', label: '📅 Calendar', url: '/static/calendar.html' },
    { id: 'chat',     label: '💬 Chat',     url: '/static/chat-interface.html' },
    { id: 'memory',   label: '🧠 Memory',   url: '/static/memory-browser.html' },
  ];

  // Detect current page from URL
  const currentPath = window.location.pathname;
  const currentPage = PAGES.find(p => currentPath.includes(p.url)) || PAGES[0];

  // Create nav bar
  const nav = document.createElement('nav');
  nav.className = 'workdaddy-nav';
  nav.innerHTML = `
    <div class="workdaddy-nav-brand">
      <a href="/static/index.html" class="workdaddy-nav-logo">🦾 Work Daddy</a>
    </div>
    <div class="workdaddy-nav-links">
      ${PAGES.map(p => `
        <a href="${p.url}" class="workdaddy-nav-link ${p.id === currentPage.id ? 'active' : ''}" data-page="${p.id}">
          ${p.label}
        </a>
      `).join('')}
    </div>
  `;

  // Insert at top of body
  document.body.insertBefore(nav, document.body.firstChild);

  // Add padding to body so content isn't hidden under nav
  document.body.style.paddingTop = '52px';
})();
