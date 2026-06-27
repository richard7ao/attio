#!/usr/bin/env bash
# =============================================================================
# dev-tunnel.sh — run the API + worker locally and expose them via a public
# cloudflared tunnel so the Vercel-deployed web SPA can call them.
#
# Usage:
#   ./scripts/dev-tunnel.sh <vercel-web-url>
#   ./scripts/dev-tunnel.sh https://attio-web.vercel.app
#
# What it does:
#   1. Starts the Fastify API in postgres mode (talks to Supabase), with
#      CORS_ORIGIN set to the Vercel web URL so the browser allows the calls.
#   2. Starts the worker (LISTENs for company_changed on Supabase).
#   3. Starts a cloudflared quick tunnel on http://localhost:3001.
#   4. Prints the public tunnel URL — set it as VITE_API_BASE_URL on Vercel.
#
# Press Ctrl+C to stop everything.
# =============================================================================
set -euo pipefail

WEB_URL="${1:-${VERCEL_WEB_URL:-}}"
if [[ -z "$WEB_URL" ]]; then
  echo "Usage: $0 <vercel-web-url>" >&2
  echo "  e.g. $0 https://attio-web.vercel.app" >&2
  exit 1
fi

# Load repo .env (has DATABASE_URL, ATTIO_API_KEY, etc.)
set -a
source "$(dirname "$0")/../.env"
set +a

# Force postgres driver so the API + worker talk to Supabase, not local sqlite.
export DATABASE_DRIVER=postgres
export CORS_ORIGIN="$WEB_URL"
export NODE_ENV=production

echo "==> API  : postgres mode, CORS_ORIGIN=$CORS_ORIGIN"
echo "==> Worker: LISTEN on company_changed (Supabase)"
echo "==> Tunnel: cloudflared -> http://localhost:3001"
echo

PIDS=()

cleanup() {
  echo
  echo "==> shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start the API (built dist if present, else tsx dev mode).
if [[ -f apps/api/dist/server.js ]]; then
  ( cd apps/api && node dist/server.js ) &
else
  ( cd apps/api && pnpm exec tsx src/server.ts ) &
fi
PIDS+=("$!")

# Start the worker.
if [[ -f apps/worker/dist/index.js ]]; then
  ( cd apps/worker && node dist/index.js ) &
else
  ( cd apps/worker && pnpm exec tsx src/index.ts ) &
fi
PIDS+=("$!")

# Wait for the API port to be listening, then start the tunnel.
sleep 2
cloudflared tunnel --url http://localhost:3001 &
PIDS+=("$!")

echo
echo "==> Ready. Watch the cloudflared output above for the public URL"
echo "    (looks like https://<random>.trycloudflare.com)."
echo "    Set it on Vercel:  vercel env add VITE_API_BASE_URL"
echo "    then redeploy:     vercel --prod"
echo

wait
