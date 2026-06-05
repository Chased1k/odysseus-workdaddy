# Skill: Cloudflare Tunnel Manager for Work Daddy

## Overview

Manage persistent Cloudflare tunnels (`cloudflared`) for the Work Daddy / OpenClaw ecosystem. Replaces ephemeral Quick Tunnels with named, permanent tunnels under the `wdfab.io` domain.

**Domain:** `wdfab.io` — owned by Kellen, managed via Cloudflare
**Primary use:** Serve Work Daddy UI (Odysseus) and OpenClaw gateway from a stable, bookmarkable URL
**Secondary use:** Create temporary tunnels for demos, presentations, testing

---

## What This Skill Does

- **Create** named tunnels with `cloudflared tunnel create`
- **Run** tunnels as systemd service or Docker container
- **Route** traffic: `workdaddy.wdfab.io` → `localhost:7002`, etc.
- **List** active tunnels, their URLs, uptime
- **Delete** tunnels when no longer needed
- **Store** tunnel metadata in Odysseus SQLite + project docs
- **Integrate** with Work Daddy UI: "Tunnel Manager" widget in sidebar

---

## Prerequisites

1. **cloudflared CLI** installed on Watchtower
2. **Cloudflare account** with `wdfab.io` DNS zone
3. **API token** with Zone:Edit + DNS:Edit permissions
4. **Authentication:** `cloudflared tunnel login` (one-time browser auth)

---

## Commands

### Create a Named Tunnel

```bash
# Create tunnel (once)
cloudflared tunnel create workdaddy-main
# Saves .json creds to ~/.cloudflared/

# Create DNS route
cloudflared tunnel route dns workdaddy-main workdaddy.wdfab.io

# Create config file
cat > ~/.cloudflared/workdaddy-main.yml << 'EOF'
tunnel: <TUNNEL_UUID_FROM_CREATE>
credentials-file: /Users/watchtower/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: workdaddy.wdfab.io
    service: http://localhost:7002
  - hostname: api.wdfab.io
    service: http://localhost:8080
  - service: http_status:404
EOF

# Run
cloudflared tunnel run workdaddy-main
```

### Run as Background Service (launchd on macOS)

```bash
# Install as service
cloudflared service install
# Or manual plist:
# See: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/as-a-service/macos/
```

### Docker Compose Integration

Add to `workdaddy-dev/docker-compose.yml`:

```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ~/.cloudflared:/etc/cloudflared:ro
    restart: unless-stopped
    networks:
      - app-network
```

---

## Tunnel Manager UI (Work Daddy Widget)

### Features
- **List View:** All tunnels with status (🟢 active / 🔴 stopped / 🟡 error)
- **Quick Actions:** Start, Stop, Delete, Copy URL, Open in Browser
- **Create Flow:** Name input, local service selector (port), hostname suggestion
- **DNS Preview:** Shows what URL each tunnel serves
- **Uptime:** Last started, total runtime
- **Copy Button:** One-click copy tunnel URL to clipboard

### Design
- Modal widget (like TTS/Transcription)
- Sidebar button: "Tunnels" with 🌐 icon
- Rail icon: globe/web
- Route: `/tunnels`

### Data Storage
- **Primary:** `~/.cloudflared/` (cloudflared native)
- **UI cache:** Odysseus SQLite `tunnels` table
- **Project links:** Append tunnel URLs to relevant `projects/*.md` files
- **Central registry:** `projects/Active-Tunnels.md` — master list

---

## Integration Points

### With Work Daddy UI
- Widget shows tunnel status alongside other tools
- "Open Work Daddy" button → opens `workdaddy.wdfab.io`
- Alert if tunnel is down (red dot on sidebar icon)

### With Project Files
- When creating a tunnel for a project, auto-append URL to:
  - `projects/<Project-Name>.md` frontmatter or section
  - `memory/YYYY-MM-DD.md` for ephemeral links
  - `projects/Active-Tunnels.md` for permanent links

### With Odysseus SQLite
```sql
CREATE TABLE IF NOT EXISTS tunnels (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  tunnel_uuid TEXT,
  hostname TEXT,
  local_service TEXT, -- e.g., http://localhost:7002
  status TEXT DEFAULT 'stopped', -- active, stopped, error
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_started_at TIMESTAMP,
  url TEXT, -- public URL
  project TEXT, -- associated project name
  notes TEXT
);
```

---

## Security Notes

- **Tunnel creds** (`~/.cloudflared/*.json`) are sensitive — never commit
- **Domain:** `wdfab.io` is public — don't expose internal/admin services without auth
- **Service token:** Use `cloudflared access` if adding auth layer
- **IP allowlist:** Cloudflare dashboard can restrict by country/IP

---

## Next Actions (from Kellen)

1. Verify `wdfab.io` DNS is managed in Cloudflare dashboard
2. Create `workdaddy` named tunnel → `workdaddy.wdfab.io`
3. Build Tunnel Manager widget in Odysseus UI
4. Wire "create tunnel" flow into sidebar
5. Auto-save tunnel URLs to project files

---

## Related

- `projects/Work-Daddy-Architecture.md`
- `projects/Odysseus-Web-UI.md`
- `skills/cloudflare-tunnel/SKILL.md` (this file)
- Linear: WD-61 (Persistent URL Storage)
