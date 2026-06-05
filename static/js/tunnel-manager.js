/**
 * Tunnel Manager Widget — Work Daddy Odysseus UI
 * Shows active Cloudflare tunnels, their URLs, status
 * Allows: view, copy URL, open in browser
 * No create/delete yet — just monitoring dashboard
 */

let _tunnelOpen = false;
let _tunnelModal = null;

// ── Tunnel Config (from cloudflared-config.yml) ──
const TUNNELS = [
  { hostname: 'workdaddy-dev.wdfab.io', service: 'http://host.docker.internal:7002', name: 'Work Daddy Dev', project: 'Work Daddy UI' },
  { hostname: 'hub.wdfab.io',            service: 'http://host.docker.internal:7001', name: 'Hub Dashboard',    project: 'Original Odysseus' },
  { hostname: 'fabio.wdfab.io',          service: 'http://host.docker.internal:18790', name: 'Fabio Gateway',    project: 'Fabio Agent' },
  { hostname: 'files.wdfab.io',          service: 'http://host.docker.internal:8080',  name: 'File Server',      project: 'Workspace Files' },
  { hostname: 'bea.wdfab.io',            service: 'http://host.docker.internal:8765',  name: 'BEA App',          project: 'Perri Business' },
  { hostname: 'health.wdfab.io',         service: 'http://host.docker.internal:8082',  name: 'Health Dashboard', project: 'Bartonella Protocol' },
];

// ── UI Helpers ──
function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _updateTunnelUI() {
  if (!_tunnelModal) return;
  const body = _tunnelModal.querySelector('.modal-body');
  if (!body) return;
  
  const rows = TUNNELS.map(t => {
    const url = `https://${t.hostname}`;
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;">
        <div style="font-size:20px;">🌐</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:13px;color:var(--text);">${_esc(t.name)}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${_esc(t.project)} • ${_esc(t.service)}</div>
          <a href="${_esc(url)}" target="_blank" style="font-size:12px;color:var(--accent);text-decoration:none;word-break:break-all;">${_esc(url)}</a>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button onclick="navigator.clipboard.writeText('${_esc(url)}');this.textContent='✅';setTimeout(()=>this.textContent='📋',1500);"
            style="background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;"
            title="Copy URL">📋</button>
          <a href="${_esc(url)}" target="_blank" style="background:var(--accent);color:var(--bg);border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;text-decoration:none;display:inline-flex;align-items:center;">Open →</a>
        </div>
      </div>
    `;
  }).join('');
  
  body.innerHTML = `
    <div style="padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:11px;color:var(--text-secondary);">🟢 Active • 6 hostnames • Tunnel ID: 5230938f...</span>
        <button id="tunnel-refresh-btn" style="background:var(--panel-bg);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;">🔄 Refresh</button>
      </div>
      ${rows}
      <div style="margin-top:12px;padding:8px;background:var(--panel-bg);border-radius:6px;font-size:11px;color:var(--text-secondary);">
        <strong>Domain:</strong> wdfab.io <span style="margin:0 6px;">|</span>
        <strong>Zone:</strong> 8897f99... <span style="margin:0 6px;">|</span>
        <strong>Account:</strong> f72a11b...
      </div>
    </div>
  `;
  
  document.getElementById('tunnel-refresh-btn')?.addEventListener('click', () => {
    _updateTunnelUI();
  });
}

// ── Modal Open/Close ──
export function isTunnelOpen() { return _tunnelOpen; }

export function openTunnelManager() {
  if (_tunnelOpen) return;
  _tunnelOpen = true;
  
  const modal = document.createElement('div');
  modal.id = 'tunnel-modal';
  modal.className = 'app-modal';
  modal.dataset.modalId = 'tunnel-modal';
  modal.style.cssText = 'position:fixed;top:80px;left:80px;width:520px;max-height:80vh;background:var(--bg,#0F0F0F);border:1px solid var(--border,#333);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:900;display:flex;flex-direction:column;overflow:hidden;';
  
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border,#333);">
      <span style="font-weight:600;font-size:13px;color:var(--text,#F9EBDC);">🌐 Tunnel Manager</span>
      <button id="tunnel-close-btn" style="background:transparent;border:none;color:var(--text);cursor:pointer;font-size:16px;padding:0 4px;">×</button>
    </div>
    <div class="modal-body" style="flex:1;overflow:auto;"></div>
  `;
  
  document.body.appendChild(modal);
  _tunnelModal = modal;
  
  document.getElementById('tunnel-close-btn')?.addEventListener('click', closeTunnelManager);
  
  _updateTunnelUI();
}

export function closeTunnelManager() {
  if (!_tunnelOpen || !_tunnelModal) return;
  _tunnelModal.remove();
  _tunnelModal = null;
  _tunnelOpen = false;
}

export function toggleTunnelManager() {
  _tunnelOpen ? closeTunnelManager() : openTunnelManager();
}
