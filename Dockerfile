# =============================================================================
# MILITARY PASS — Next.js Frontend Dockerfile (Hugging Face Spaces)
# =============================================================================
# Target:  huggingface.co/spaces/fashionistar/military-pass-frontend
# Port:    7860 (HF mandatory)
# UID:     1000 (HF mandatory)
#
# Architecture mirrors the fashionistar_backend Dockerfile conventions:
#   ✓ Multi-stage build (deps → builder → runner) for minimal final image
#   ✓ Non-root UID 1000 (HF Spaces requirement)
#   ✓ Stage-scoped ARGs (declared AFTER FROM) so HF Spaces can inject
#     Space "Variables" as Docker build-args without breaking FROM lines
#     (global pre-FROM ARGs get silently overridden by HF's injection —
#     see fashionistar-api-v1 Dockerfile comment for the same gotcha)
#   ✓ next.config.js `output: "standalone"` for a minimal runtime footprint
#   ✓ Custom server.js (WebSocket + HTTP) copied over the auto-generated
#     standalone server so real-time face-swap/voice streaming works
#   ✓ `ws` package copied in manually — standalone tracing only bundles
#     packages imported by traced app/page files, not by server.js
#   ✓ dos2unix safety net for Windows-authored entrypoint.sh
#
# HF Spaces Dev Mode requirements (PRO plan):
#   ✓ bash, curl, procps installed
#   ✓ /app owned by UID 1000
#   ✓ CMD/ENTRYPOINT instruction present

# Port: 7860 (HF mandatory) | UID: 1000 (HF mandatory)
# Multi-stage: deps → builder → runner | standalone output
# Stage-scoped ARGs (after FROM) avoid HF Spaces build-arg injection gotcha.
# `ws` is copied manually — standalone tracing doesn't bundle server.js imports.
# dos2unix strips CRLF from Windows-authored entrypoint.sh.
# =============================================================================

# ── Stage 1: dependency installer ────────────────────────────────────────────
FROM node:22-slim AS deps

ENV NODE_ENV=development

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./

# npm ci gives fully reproducible installs from the lockfile
RUN npm ci --include=dev

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time ARGs — NEXT_PUBLIC_* inlined into client bundle at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_HF_AI_SPACE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=${NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=${NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY} \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_HF_AI_SPACE_URL=${NEXT_PUBLIC_HF_AI_SPACE_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:22-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    WEBSOCKET_ENABLED=true

# Runtime system dependencies
# IMPORTANT: bash, curl, procps are REQUIRED for HF Spaces Dev Mode (PRO plan).
# dos2unix strips Windows CRLF (\r\n) from entrypoint.sh (safety net for Windows devs).
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    dos2unix \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Non-root app user (UID 1000 — HF Spaces mandatory)
RUN groupadd --gid 1000 appuser && useradd --create-home --uid 1000 --gid appuser --shell /bin/bash appuser \
    && mkdir -p /app && chown -R appuser:appuser /app /home/appuser

WORKDIR /app

# Next.js standalone output — minimal, pruned node_modules + server bootstrap
COPY --from=builder --chown=appuser:appuser /app/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appuser /app/public ./public

# Our custom WebSocket-aware server replaces Next's auto-generated standalone server.js
COPY --chown=appuser:appuser server.js ./server.js

# `ws` isn't traced by standalone build (only server.js imports it, not app/ routes)
COPY --from=deps --chown=appuser:appuser /app/node_modules/ws ./node_modules/ws

# Entrypoint as root (must be before USER switch to set ownership + strip CRLF)
COPY --chown=appuser:appuser entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

USER appuser

# Port 7860 — mandatory for HF Spaces
EXPOSE 7860

# Health check — polls the transport-discovery endpoint
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-7860}/api/ws" || exit 1

ENTRYPOINT ["/entrypoint.sh"]

# Default: start the custom Next.js + WebSocket production server.
CMD ["node", "server.js"]
