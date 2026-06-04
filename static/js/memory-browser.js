/**
 * Memory Browser — Search & browse across memory sources
 *
 * Sources supported (mock data for now):
 *   - Obsidian Vault      → ~/workspace/obsidian/
 *   - Qdrant RAG          → localhost:6333
 *   - Session Logs        → local session transcripts
 *
 * Theme: Work Daddy (bg: #1A1A1A, panel: #235E36, text: #F9EBDC,
 *        accent: #A8E10C, border: #FAAFCC)
 */

// ═══════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════

const MOCK_MEMORIES = [
  {
    id: 'obs-001',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'memory/2026-05-30.md',
    excerpt: 'Kellen decided to pivot the \u003cmark\u003eMLB RAG Pipeline\u003c/mark\u003e from Pinecone to Qdrant after benchmarking showed 3x faster ingestion. Perri approved the change. Need to migrate existing embeddings before July.',
    relevance: 0.94,
    timestamp: 1717099200,
  },
  {
    id: 'obs-002',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'projects/warrior-dog.md',
    excerpt: 'Scarlet completed level 1 sprite animation for \u003cmark\u003eWarrior Dog\u003c/mark\u003e. Next: outfit select screen + attack mechanics. Using Phaser 3.6. Need asset pack from Kenney oritch.',
    relevance: 0.87,
    timestamp: 1717102800,
  },
  {
    id: 'qdr-001',
    source: 'qdrant',
    sourceLabel: 'Qdrant RAG',
    file: 'collection: magic-led-business',
    excerpt: 'Module 4 transcript chunk: "The \u003cmark\u003eMagic Led\u003c/mark\u003e approach isn't about forcing outcomes—it's about noticing what already wants to happen. Your business is a living system."',
    relevance: 0.91,
    timestamp: 1717178400,
  },
  {
    id: 'qdr-002',
    source: 'qdrant',
    sourceLabel: 'Qdrant RAG',
    file: 'collection: magic-led-business',
    excerpt: 'FAQ embedding #42: "How do I know if I'm intuition-led or fear-led?" — Answer distinguishes somatic \u003cmark\u003efear\u003c/mark\u003e (constricted chest) vs. intuitive expansion (open, grounded).',
    relevance: 0.85,
    timestamp: 1717264800,
  },
  {
    id: 'ses-001',
    source: 'session',
    sourceLabel: 'Session Log',
    file: 'session-2026-06-03T14:22.log',
    excerpt: 'User asked about SamCart checkout flow integration. \u003cmark\u003eSamCart\u003c/mark\u003e webhook to Zapier to Mighty Networks is confirmed working. Next: add upsell tracking in HubSpot.',
    relevance: 0.82,
    timestamp: 1717441200,
  },
  {
    id: 'ses-002',
    source: 'session',
    sourceLabel: 'Session Log',
    file: 'session-2026-06-03T16:45.log',
    excerpt: 'Kellen requested a new skill for \u003cmark\u003eGTM/GA4 tracking\u003c/mark\u003e verification. Discussed using Playwright MCP to check tag firing on perrichase.com checkout pages.',
    relevance: 0.78,
    timestamp: 1717449900,
  },
  {
    id: 'obs-003',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'daily/2026-06-02.md',
    excerpt: 'Morning briefing generated. Markets: S\u0026P flat, BTC +2.4%. \u003cmark\u003eAI news\u003c/mark\u003e: Gemini 2.5 Pro preview, OpenAI Agents SDK update. No urgent emails. Calendar clear until 2pm coaching call.',
    relevance: 0.75,
    timestamp: 1717344000,
  },
  {
    id: 'qdr-003',
    source: 'qdrant',
    sourceLabel: 'Qdrant RAG',
    file: 'collection: permission-school',
    excerpt: 'Cohort 3 onboarding script: Welcome flow should reference their \u003cmark\u003eChrysalis\u003c/mark\u003e stage (Egg → Caterpillar → Butterfly). Do NOT send full curriculum on day 1.',
    relevance: 0.88,
    timestamp: 1717351200,
  },
  {
    id: 'ses-003',
    source: 'session',
    sourceLabel: 'Session Log',
    file: 'session-2026-06-02T09:15.log',
    excerpt: 'System check: OpenClaw gateway healthy. Telegram bot latency ~120ms. \u003cmark\u003eWatchtower\u003c/mark\u003e disk at 62%. No failed cron jobs in last 24h. Scheduled task queue: 3 pending.',
    relevance: 0.71,
    timestamp: 1717328100,
  },
  {
    id: 'obs-004',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'family/joyce-visit.md',
    excerpt: 'Joyce \u0026 Geoff visiting May 8–15, 2026. United conf: PZQ11V. Joyce needs wheelchair assistance at airport—already requested. \u003cmark\u003eArchie\u003c/mark\u003e PT: call hydro treadmill places before trip.',
    relevance: 0.69,
    timestamp: 1714502400,
  },
  {
    id: 'obs-005',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'perri/cirs-protocol.md',
    excerpt: 'Dr. Dorninger protocol: binders 30 min before meals, no sauna after 2pm. \u003cmark\u003eCIRS\u003c/mark\u003e supplements in pill organizer. Perri's VCS test: 7 misses this week (improvement from 12).',
    relevance: 0.73,
    timestamp: 1716854400,
  },
  {
    id: 'qdr-004',
    source: 'qdrant',
    sourceLabel: 'Qdrant RAG',
    file: 'collection: gsm-archive',
    excerpt: 'GSM Call 2026-05-28 transcript: Perri on "receiving mode" — "The body knows before the mind. \u003cmark\u003ePractice\u003c/mark\u003e dropping from head to heart before any decision today."',
    relevance: 0.90,
    timestamp: 1716921600,
  },
  {
    id: 'ses-004',
    source: 'session',
    sourceLabel: 'Session Log',
    file: 'session-2026-06-01T11:30.log',
    excerpt: 'Kellen: "Can we make the \u003cmark\u003ememory browser\u003c/mark\u003e feel less like a database and more like a second brain?" Agreed on card-based layout with source badges and relevance bars.',
    relevance: 0.95,
    timestamp: 1717251000,
  },
  {
    id: 'obs-006',
    source: 'obsidian',
    sourceLabel: 'Obsidian Vault',
    file: 'trading/series57-study.md',
    excerpt: 'Knopman Marks \u003cmark\u003eSeries 57\u003c/mark\u003e: Completed Unit 4 (Market Making). Mock exam: 82%. Weak area: options greeks in multi-leg strategies. Review before scheduling real exam.',
    relevance: 0.66,
    timestamp: 1716336000,
  },
];

// ═══════════════════════════════════════
// State
// ═══════════════════════════════════════

let currentFilter = 'all';
let currentSort = 'relevance';
let currentQuery = '';
let filteredResults = [];

// ═══════════════════════════════════════
// DOM Refs
// ═══════════════════════════════════════

const els = {
  searchInput: document.getElementById('mb-search-input'),
  filterPills: document.querySelectorAll('.mb-filter-pill'),
  resultsList: document.getElementById('mb-results-list'),
  resultsCount: document.getElementById('mb-results-count'),
  sortSelect: document.getElementById('mb-sort-select'),
  recentList: document.getElementById('mb-recent-list'),
  statDocs: document.getElementById('mb-stat-docs'),
  statSources: document.getElementById('mb-stat-sources'),
  statIndexed: document.getElementById('mb-stat-indexed'),
};

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function formatTime(ts) {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function highlightQuery(text, query) {
  if (!query.trim()) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function getSourceIconClass(source) {
  return {
    obsidian: 'mb-source-obsidian',
    qdrant: 'mb-source-qdrant',
    session: 'mb-source-session',
  }[source] || 'mb-source-obsidian';
}

function getSourceInitial(source) {
  return {
    obsidian: 'Ob',
    qdrant: 'Qd',
    session: 'Se',
  }[source] || '??';
}

// ═══════════════════════════════════════
// Stats
// ═══════════════════════════════════════

function updateStats() {
  els.statDocs.textContent = MOCK_MEMORIES.length;

  const sources = new Set(MOCK_MEMORIES.map(m => m.source));
  els.statSources.textContent = sources.size;

  const newest = Math.max(...MOCK_MEMORIES.map(m => m.timestamp));
  els.statIndexed.textContent = formatTime(newest);
}

// ═══════════════════════════════════════
// Recent Sidebar
// ═══════════════════════════════════════

function renderRecent() {
  const recent = [...MOCK_MEMORIES]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  els.recentList.innerHTML = recent.map(item => `
    <div class="mb-recent-item" data-id="${item.id}">
      <div class="mb-recent-source">
        <span class="mb-result-source-icon ${getSourceIconClass(item.source)}">${getSourceInitial(item.source)}</span>
        ${item.sourceLabel}
      </div>
      <div class="mb-recent-excerpt">${item.excerpt.replace(/<mark>/g, '').replace(/<\/mark>/g, '')}</div>
      <div class="mb-recent-time">${formatTime(item.timestamp)}</div>
    </div>
  `).join('');

  // Click to search by that item's keywords
  els.recentList.querySelectorAll('.mb-recent-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const item = MOCK_MEMORIES.find(m => m.id === id);
      if (item) {
        els.searchInput.value = item.excerpt.split(' ').slice(0, 3).join(' ');
        els.searchInput.dispatchEvent(new Event('input'));
      }
    });
  });
}

// ═══════════════════════════════════════
// Results
// ═══════════════════════════════════════

function filterAndSort() {
  let results = [...MOCK_MEMORIES];

  // Filter by source
  if (currentFilter !== 'all') {
    results = results.filter(r => r.source === currentFilter);
  }

  // Filter by query (search across file, excerpt, sourceLabel)
  const q = currentQuery.trim().toLowerCase();
  if (q) {
    results = results.filter(r =>
      r.file.toLowerCase().includes(q) ||
      r.excerpt.toLowerCase().includes(q) ||
      r.sourceLabel.toLowerCase().includes(q)
    );
  }

  // Sort
  if (currentSort === 'relevance') {
    results.sort((a, b) => b.relevance - a.relevance);
  } else if (currentSort === 'newest') {
    results.sort((a, b) => b.timestamp - a.timestamp);
  } else if (currentSort === 'oldest') {
    results.sort((a, b) => a.timestamp - b.timestamp);
  }

  filteredResults = results;
  renderResults();
}

function renderResults() {
  const { resultsList, resultsCount } = els;

  if (filteredResults.length === 0) {
    resultsCount.textContent = 'No results';
    resultsList.innerHTML = `
      <div class="mb-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <p>No memories match your search.</p>
        <p style="font-size:0.75rem;margin-top:4px;">Try a different keyword or switch filters.</p>
      </div>
    `;
    return;
  }

  resultsCount.textContent = `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`;

  resultsList.innerHTML = filteredResults.map(item => {
    const excerpt = highlightQuery(item.excerpt, currentQuery);
    const relPct = Math.round(item.relevance * 100);
    return `
      <div class="mb-result-card" data-id="${item.id}">
        <div class="mb-result-header">
          <div class="mb-result-source">
            <span class="mb-result-source-icon ${getSourceIconClass(item.source)}">${getSourceInitial(item.source)}</span>
            ${item.sourceLabel}
          </div>
          <div class="mb-result-meta">
            <span class="mb-relevance">
              <span class="mb-relevance-bar"><span class="mb-relevance-fill" style="width:${relPct}%"></span></span>
              ${relPct}%
            </span>
            <span>${formatTime(item.timestamp)}</span>
          </div>
        </div>
        <div class="mb-result-excerpt">${excerpt}</div>
        <div class="mb-result-path">${item.file}</div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════

function init() {
  // Search input
  els.searchInput.addEventListener('input', (e) => {
    currentQuery = e.target.value;
    filterAndSort();
  });

  // Filter pills
  els.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      els.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      filterAndSort();
    });
  });

  // Sort
  els.sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    filterAndSort();
  });

  // Initial render
  updateStats();
  renderRecent();
  filterAndSort();
}

// ═══════════════════════════════════════
// Future Integration Hooks (stubbed)
// ═══════════════════════════════════════

/**
 * Load memories from the local Obsidian vault.
 * Expected: read markdown files from ~/workspace/obsidian/,
 * extract frontmatter + body chunks, return array matching MOCK_MEMORIES shape.
 */
export async function loadObsidianMemories() {
  // TODO: Call backend endpoint /api/memory/obsidian or read via File System Access
  // return fetch('/api/memory/obsidian').then(r => r.json());
  throw new Error('Obsidian integration not yet wired');
}

/**
 * Search Qdrant vector DB via the local API.
 * Expected: POST localhost:6333/collections/{name}/points/search
 * with the query vector and limit.
 */
export async function searchQdrant(collection, vector, limit = 10) {
  // TODO: Wire to Qdrant REST API or backend proxy
  // const res = await fetch(`http://localhost:6333/collections/${collection}/points/search`, { method: 'POST', body: JSON.stringify({ vector, limit }) });
  // return res.json();
  throw new Error('Qdrant integration not yet wired');
}

/**
 * Load recent session logs.
 * Expected: read from local session log directory or backend /api/sessions/logs
 */
export async function loadSessionLogs() {
  // TODO: Backend endpoint or local file glob
  // return fetch('/api/sessions/logs?limit=50').then(r => r.json());
  throw new Error('Session log integration not yet wired');
}

/**
 * Refresh all sources and re-index.
 * Called manually or on a schedule.
 */
export async function refreshAll() {
  // TODO: Parallel load from all three sources, merge, de-duplicate, re-render
  // const [obsidian, qdrant, sessions] = await Promise.allSettled([
  //   loadObsidianMemories(),
  //   searchQdrant(...),
  //   loadSessionLogs()
  // ]);
  console.log('Refresh all — not yet implemented');
}

// ═══════════════════════════════════════
// Boot
// ═══════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
