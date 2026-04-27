#!/usr/bin/env bash
# ─── WorkProof — Start All Services ──────────────────────────────────────────
# Usage:  bash start.sh
#
# Starts three services:
#   1. FastAPI backend         http://localhost:8000
#   2. Midnight Node.js bridge http://localhost:6300
#   3. React frontend (Vite)   http://localhost:3000
#
# Prerequisites:
#   Python 3.11+  source .venv/bin/activate  (venv lives inside project root)
#   Node.js 20+   frontend: npm install
#                 midnight-service: npm install
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Activate Python venv ──────────────────────────────────────────────────────
if [[ -f "$ROOT/.venv/bin/activate" ]]; then
  source "$ROOT/.venv/bin/activate"
fi

# ── Kill any stale processes first ────────────────────────────────────────────
echo ""
echo "⟳  Clearing stale processes on :8000 :6300 :3000 …"
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "node index.js"    2>/dev/null || true
pkill -f "vite"             2>/dev/null || true
sleep 1

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▶  Starting FastAPI backend on :8000 …"
cd "$ROOT/backend"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Midnight Service ──────────────────────────────────────────────────────────
echo "▶  Starting Midnight service on :6300 …"
cd "$ROOT/midnight-service"
node index.js &
MIDNIGHT_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "▶  Starting React frontend on :3000 …"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "─────────────────────────────────────────────────────────"
echo "  WorkProof is running"
echo "  Frontend:          http://localhost:3000"
echo "  Backend API:       http://localhost:8000"
echo "  Backend docs:      http://localhost:8000/docs"
echo "  Midnight service:  http://localhost:6300"
echo "  Health checks:     http://localhost:8000/health"
echo "                     http://localhost:6300/health"
echo "─────────────────────────────────────────────────────────"
echo "  Press Ctrl+C to stop all services"
echo ""

# Kill all on Ctrl-C / SIGTERM
trap "echo ''; echo 'Stopping…'; kill $BACKEND_PID $MIDNIGHT_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
