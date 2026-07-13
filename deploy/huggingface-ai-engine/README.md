---
title: Military Pass AI Engine
emoji: 🎖️
colorFrom: blue
colorTo: blue
sdk: gradio
sdk_version: "5.0.0"
app_file: app.py
pinned: true
license: mit
short_description: Military Pass AI Platform — Face Swap & Voice Transformation
---

# 🎖️ Military Pass AI Engine

**Production ZeroGPU AI Service for the Military Pass platform**

## Architecture

This space runs the AI inference engine using:
- **Gradio 5.x** as the HF Spaces SDK
- **ZeroGPU** for on-demand A10G GPU access
- **InsightFace inswapper_128** for face swap
- **GFPGAN v1.4** for face restoration
- **WORLD vocoder (pyworld)** for voice transformation
- **HuBERT + FAISS** for custom voice model training

## Endpoints

```
POST /run/health_check       — Service health + model availability
POST /run/face_swap          — Face swap on base64 image
POST /run/voice_transform    — Voice transformation with presets
POST /run/voice_train        — Train custom voice model
POST /run/warmup             — Pre-warm GPU memory
```

## Environment Variables (set as HF Space secrets)

- `HF_TOKEN` — HF Hub token (8x ZeroGPU quota)
- `MODAL_AUTH_TOKEN` — Modal.com auth token (for proxying)
- `MODAL_FACE_SWAP_URL` — Existing Modal face swap endpoint
- `MODAL_VOICE_URL` — Existing Modal voice endpoint

## Note

This HF Space does NOT disrupt existing Modal.com deployments.
Modal workers continue to serve production traffic. This space provides
a backup GPU endpoint and Gradio UI for manual testing.
