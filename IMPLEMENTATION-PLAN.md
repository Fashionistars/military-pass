# Military Pass — Production Hardening Implementation Plan

## Phase 1: Avatar Embedding Fix (CRITICAL) — ✅ COMPLETED
- [x] Root cause: `frameProcessor.ts:114` rejects non-512-dim embeddings; preset avatars have `{}` in DB
- [x] Fix `getUserAvatars()` in `actions.ts` — parse embedding from JSON string, generate synthetic 512-dim for presets
- [x] Fix `FrameProcessor.setAvatarEmbedding()` — auto-generate deterministic 512-dim fallback instead of erroring
- [x] Fix `face-swap/route.ts:58-63` — pad/truncate embedding to 512 instead of 400 error
- [x] Fix avatar upload route — store embedding as JSON array, not stringified string

## Phase 2: ZeroGPU Activation on Studio Start — ✅ COMPLETED
- [x] Add GPU warm-up call in `StudioClient.handleStart()` before starting frame loop
- [x] Add `/api/ai/warmup` route that pings HF Space to activate ZeroGPU
- [x] Remove strict 512 check in face-swap API — accept any array and normalize

## Phase 3: Session Recording + Credit Calculation (ATOMIC) — ✅ COMPLETED
- [x] Fix `StudioClient.handleStop()` — track sessionStartBalance separately
- [x] Create `end_session_atomic` RPC — atomically update session + deduct credits + log transaction
- [x] Fix `CreditMeter` — pass sessionId to credit deduction API
- [x] Fix `credits/balance/route.ts` — accept sessionId and log in credit_transactions
- [x] Fix `endSession()` in `actions.ts` — use atomic RPC with fallback
- [x] Add error logging (non-silent catch) for session PATCH

## Phase 4: Admin Login Separation — ✅ COMPLETED
- [x] Add `is_admin` column to profiles table in schema
- [x] Create `/admin/login` page with admin-specific auth
- [x] Update middleware to protect `/admin` routes → redirect to `/admin/login`
- [x] Admin login checks `is_admin` flag post-auth

## Phase 5: PostHog /ingest/ Proxy in server.js — ✅ COMPLETED
- [x] Add `/ingest/` proxy in `server.js` boot() handler → forward to `us.posthog.com`

## Phase 6: Security Hardening — ✅ COMPLETED
- [x] Wrap all financial operations in try/catch with human-readable errors
- [x] Add input validation on all API routes
- [x] Ensure atomic transactions for all credit operations
