# Military Pass — Production Hardening Implementation Plan

## Phase 1: Avatar Embedding Fix (CRITICAL)
- [x] Root cause: `frameProcessor.ts:114` rejects non-512-dim embeddings; preset avatars have `{}` in DB
- [ ] Fix `getUserAvatars()` in `actions.ts` — parse embedding from JSON string, generate synthetic 512-dim for presets
- [ ] Fix `FrameProcessor.setAvatarEmbedding()` — auto-generate deterministic 512-dim fallback instead of erroring
- [ ] Fix `face-swap/route.ts:58-63` — pad/truncate embedding to 512 instead of 400 error
- [ ] Fix avatar upload route — store embedding as JSON array, not stringified string

## Phase 2: ZeroGPU Activation on Studio Start
- [ ] Add GPU warm-up call in `StudioClient.handleStart()` before starting frame loop
- [ ] Add `/api/ai/warmup` route that pings HF Space to activate ZeroGPU
- [ ] Remove strict 512 check in face-swap API — accept any array and normalize

## Phase 3: Session Recording + Credit Calculation (ATOMIC)
- [ ] Fix `StudioClient.handleStop()` — track sessionStartBalance separately
- [ ] Create `end_session_atomic` RPC — atomically update session + deduct credits + log transaction
- [ ] Fix `CreditMeter` — pass sessionId to credit deduction API
- [ ] Fix `credits/balance/route.ts` — accept sessionId and log in credit_transactions
- [ ] Fix `endSession()` in `actions.ts` — use atomic RPC
- [ ] Add error logging (non-silent catch) for session PATCH

## Phase 4: Admin Login Separation
- [ ] Add `is_admin` column to profiles table in schema
- [ ] Create `/admin/login` page with admin-specific auth
- [ ] Update middleware to protect `/admin` routes → redirect to `/admin/login`
- [ ] Admin login checks `is_admin` flag post-auth

## Phase 5: PostHog /ingest/ Proxy in server.js
- [ ] Add `/ingest/` proxy in `server.js` boot() handler → forward to `us.posthog.com`

## Phase 6: Security Hardening
- [ ] Wrap all financial operations in try/catch with human-readable errors
- [ ] Add input validation on all API routes
- [ ] Ensure atomic transactions for all credit operations
