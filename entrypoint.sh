#!/bin/bash
# =============================================================================
# MILITARY PASS — Frontend Container Entrypoint (Hugging Face Spaces)
# =============================================================================
# Mirrors the fashionistar_backend entrypoint.sh pattern:
#   ✓ Non-fatal preflight checks (missing secrets warn, never crash boot)
#   ✓ Clear structured logging for HF Spaces build/runtime logs
#   ✓ Execs the Node process as PID 1 so SIGTERM (HF restarts/rebuilds)
#     reaches server.js directly for graceful WebSocket shutdown
# =============================================================================
set -euo pipefail

echo "══════════════════════════════════════════════════════════════"
echo "  Military Pass — Frontend container starting"
echo "  Node:  $(node --version)"
echo "  Port:  ${PORT:-7860}"
echo "  WEBSOCKET_ENABLED: ${WEBSOCKET_ENABLED:-false}"
echo "══════════════════════════════════════════════════════════════"

# ── Preflight: verify standalone build exists ───────────────────────────────
if [ ! -f "/app/server.js" ]; then
  echo "  [FATAL] server.js not found in /app" >&2
  exit 1
fi

if [ ! -d "/app/.next" ]; then
  echo "  [FATAL] .next build directory not found" >&2
  exit 1
fi

# ── Preflight: warn (do not fail) on missing recommended secrets ───────────
required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)
optional_vars=(
  "HF_AI_SPACE_URL"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "STRIPE_SECRET_KEY"
  "PAYSTACK_SECRET_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "  [WARN] ${var} is not set — related functionality will be degraded."
  fi
done

for var in "${optional_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "  [INFO] ${var} not set — AI backend chain will fall back to dev-echo where applicable."
  fi
done

if [ -z "${HF_AI_SPACE_URL:-}${NEXT_PUBLIC_HF_AI_SPACE_URL:-}" ]; then
  echo "  [INFO] Using default Hugging Face AI Space URL (fashionistar/military-pass-ai)."
fi

echo "  AI backend priority: ${AI_BACKEND_PRIORITY:-hf}"
echo "══════════════════════════════════════════════════════════════"

# Hand off to the Node process (PID 1) — exec ensures signals propagate correctly.
exec "$@"
