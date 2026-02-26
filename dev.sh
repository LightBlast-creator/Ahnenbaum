#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── Cleanup on exit ──────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "⏹  Shutting down..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null || true
  wait $SERVER_PID $CLIENT_PID 2>/dev/null || true
  echo "✅ All processes stopped."
}
trap cleanup EXIT INT TERM

# ── Run migrations ───────────────────────────────────────────────────
echo "🗄  Running database migrations..."
npm run db:migrate -w packages/server

# ── Start server ─────────────────────────────────────────────────────
echo "🚀 Starting server (port 3900)..."
npm run dev -w packages/server &
SERVER_PID=$!

# ── Start client ─────────────────────────────────────────────────────
echo "🖥  Starting client (port 5900)..."
npm run dev -w packages/client &
CLIENT_PID=$!

# ── Open browser ─────────────────────────────────────────────────────
sleep 3
echo "🌐 Opening http://localhost:5900 ..."
open http://localhost:5900 2>/dev/null || xdg-open http://localhost:5900 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ahnenbaum dev environment running"
echo "  Server: http://localhost:3900"
echo "  Client: http://localhost:5900"
echo "  Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Wait for both processes ──────────────────────────────────────────
wait
