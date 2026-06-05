#!/bin/bash
# scripts/tunnel-manager.sh — Cloudflare Tunnel Manager for Work Daddy
# Usage: ./tunnel-manager.sh [status|start|stop|restart|logs]

set -e

COMPOSE_FILE="$(dirname "$0")/../docker-compose.yml"
PROJECT_NAME="workdaddy-dev"
TUNNEL_SERVICE="cloudflared"

function show_help() {
  cat << 'EOF'
Cloudflare Tunnel Manager for Work Daddy

Usage: tunnel-manager.sh <command>

Commands:
  status    Show tunnel status and assigned hostnames
  start     Start the tunnel container
  stop      Stop the tunnel container
  restart   Restart the tunnel container
  logs      Tail tunnel logs
  url       Show all active tunnel URLs

Examples:
  ./tunnel-manager.sh status
  ./tunnel-manager.sh start
  ./tunnel-manager.sh logs -f
EOF
}

function tunnel_status() {
  echo "=== Cloudflare Tunnel Status ==="
  docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps "$TUNNEL_SERVICE" || true
  
  echo ""
  echo "=== Tunnel URLs ==="
  cat "$(dirname "$0")/../cloudflared-config.yml" | grep -E "^\s+hostname:" | awk '{print $2}' | while read hostname; do
    echo "  • https://$hostname"
  done
  
  echo ""
  echo "=== Local Services ==="
  cat "$(dirname "$0")/../cloudflared-config.yml" | grep -E "^\s+service:" | grep -v "http_status:404" | awk '{print $2}' | while read service; do
    echo "  → $service"
  done
}

function tunnel_start() {
  echo "Starting Cloudflare tunnel..."
  docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d "$TUNNEL_SERVICE"
  sleep 3
  tunnel_status
}

function tunnel_stop() {
  echo "Stopping Cloudflare tunnel..."
  docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" stop "$TUNNEL_SERVICE"
}

function tunnel_restart() {
  echo "Restarting Cloudflare tunnel..."
  docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart "$TUNNEL_SERVICE"
  sleep 3
  tunnel_status
}

function tunnel_logs() {
  docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs "$TUNNEL_SERVICE" "$@"
}

function tunnel_urls() {
  echo "=== Active Tunnel URLs ==="
  cat "$(dirname "$0")/../cloudflared-config.yml" | grep -E "^\s+hostname:" | awk '{print $2}' | while read hostname; do
    echo "  https://$hostname"
  done
}

# Main
case "${1:-status}" in
  status)    tunnel_status ;;
  start)     tunnel_start ;;
  stop)      tunnel_stop ;;
  restart)   tunnel_restart ;;
  logs)      shift; tunnel_logs "$@" ;;
  url|urls)  tunnel_urls ;;
  help|--help|-h) show_help ;;
  *)
    echo "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
