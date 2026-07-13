---
title: Military Pass
emoji: 🎖️
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Military Pass — Frontend (Next.js on Hugging Face Spaces / Docker)

Real-time face-swap & voice transformation platform. This Space hosts the
**Next.js 16 frontend** with a custom Node server that serves both the
website and a native **WebSocket** endpoint for sub-second AI streaming.

## Architecture

```
Browser ── wss/https ──▶ this Space (server.js, port 7860)
                              │
                              ├─ WebSocket /api/ws  (primary transport)
                              ├─ HTTP     /api/ws   (automatic fallback)
                              │
                              ▼
                   lib/aiBackend.ts priority chain
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
  Hugging Face ZeroGPU Space          Modal.com A10G workers
  fashionistar/military-pass-ai         (secondary fallback)
       (primary AI backend)
```

- **Transport**: the browser negotiates WebSocket first; if unavailable
  (e.g. cold start, proxy issues) it transparently falls back to HTTP POST
  on the identical `/api/ws` message envelope — zero UX degradation.
- **AI backend chain**: every face-swap / voice request tries the Hugging
  Face Gradio Space first, then Modal, then a local dev-echo as a last
  resort — configurable via `AI_BACKEND_PRIORITY`.

## Required Space Secrets

| Secret                          | Purpose                                   |
|----------------------------------|--------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project URL (build + runtime)     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase anon key (build + runtime)        |
| `SUPABASE_SERVICE_ROLE_KEY`      | Server-side admin Supabase access          |
| `HF_AI_SPACE_URL`                | `https://fashionistar-military-pass-ai.hf.space` |
| `MODAL_AUTH_TOKEN`               | Modal fallback worker auth                 |
| `MODAL_FACE_SWAP_URL`            | Modal fallback face-swap endpoint          |
| `MODAL_VOICE_URL`                | Modal fallback voice endpoint              |
| `STRIPE_SECRET_KEY`              | USD payments                               |
| `PAYSTACK_SECRET_KEY`            | NGN payments                               |
| `RESEND_API_KEY`                 | Transactional email                        |

`NEXT_PUBLIC_*` values are also required as **build-time Variables** (not
just Secrets) since Next.js inlines them into the client bundle — HF Spaces
injects every configured Secret/Variable as a Docker build-arg automatically.

## Local Docker test

```bash
docker build -t military-pass-frontend .
docker run -p 7860:7860 --env-file .env.local military-pass-frontend
```

## Health check

`GET /api/ws` reports transport availability and the AI backend chain status.
