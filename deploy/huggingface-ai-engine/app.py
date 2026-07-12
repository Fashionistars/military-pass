"""
Military Pass AI Engine — Hugging Face ZeroGPU Space
=====================================================

Production entry point for the fashionistar/military-pass-ai HF Space.

Architecture:
  This file is a thin Gradio wrapper around zerogpu_engine.py.
  All core AI logic lives in zerogpu_engine.py, which is co-deployed here.

  This does NOT disrupt existing Modal.com deployments. The Modal workers
  continue to serve production traffic. This HF Space provides:
  - A backup/redundant GPU endpoint
  - ZeroGPU quota for development and testing
  - A Gradio UI for manual testing and demos

Models Loaded at Startup (ZeroGPU requirement):
  - InsightFace inswapper_128  (face swap, CUDA)
  - GFPGAN v1.4               (face restoration, CUDA)
  - MediaPipe face mesh        (boundary detection, CPU)
  - WORLD vocoder (pyworld)    (voice transformation, CPU)
  - HuBERT base               (voice feature extraction, CUDA)

Environment Variables (set in HF Space secrets):
  - HF_TOKEN             — HF Hub token (faster model downloads, 8x ZeroGPU quota)
  - MODAL_AUTH_TOKEN     — Modal.com auth token (for proxying to existing workers)
  - MODAL_FACE_SWAP_URL  — Existing Modal face swap endpoint
  - MODAL_VOICE_URL      — Existing Modal voice transform endpoint

Endpoints exposed via Gradio API (/run/<api_name>):
  POST /run/health_check       — Service health + model availability
  POST /run/face_swap          — Face swap on base64 image
  POST /run/voice_transform    — Voice transformation with presets
  POST /run/voice_train        — Train custom voice model from audio samples
  POST /run/warmup             — Pre-warm GPU memory
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path

import gradio as gr

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("militarypass.ai_engine")

# ── Load environment from .env (if present, e.g. local dev) ───────────────────
try:
    from dotenv import load_dotenv
    _env = Path(__file__).parent / ".env"
    if _env.exists():
        load_dotenv(_env)
        logger.info("Loaded .env from %s", _env)
except ImportError:
    pass

# ── ZeroGPU Token Authentication ───────────────────────────────────────────────
try:
    import spaces as _sp
    _hf_token = os.environ.get("HF_TOKEN")
    if _hf_token:
        if hasattr(_sp, "configure"):
            _sp.configure(hf_token=_hf_token)
            logger.info("ZeroGPU authenticated with HF_TOKEN (8x quota)")
        else:
            logger.warning("Installed spaces package has no configure(); continuing without token configuration")
    else:
        logger.warning("HF_TOKEN not set -- ZeroGPU running with reduced quota")
except Exception as _spaces_err:
    logger.warning("spaces.configure failed (non-critical): %s", _spaces_err)

# ── Import ZeroGPU Engine ─────────────────────────────────────────────────────
_engine_error = None

try:
    _script_dir = Path(__file__).parent
    if str(_script_dir) not in sys.path:
        sys.path.insert(0, str(_script_dir))

    from zerogpu_engine import (
        initialize_models,
        face_swap,
        voice_transform,
        train_voice_model,
        health_check as _engine_health_check,
        AI_ENGINE_VERSION,
    )
    logger.info("✅ Loaded zerogpu_engine from %s", _script_dir)
except ImportError as e:
    _engine_error = str(e)
    logger.error("❌ zerogpu_engine not found: %s", e)
    AI_ENGINE_VERSION = "error"

    def initialize_models():
        return {"insightface": False, "gfpgan": False, "world_vocoder": False, "hubert": False}

    def face_swap(frame_b64, avatar_embedding, enhance=True, align_skin=True, quality="balanced"):
        return {"success": False, "error": "zerogpu_engine not loaded"}

    def voice_transform(audio_b64, preset="operative", pitch_override=None, speed_override=None):
        return {"success": False, "error": "zerogpu_engine not loaded"}

    def train_voice_model(audio_files_b64, model_id):
        return {"success": False, "error": "zerogpu_engine not loaded"}

    def _engine_health_check():
        return {"status": "error", "error": _engine_error}

# ── Startup: load all models NOW (required before any @spaces.GPU call) ────────
logger.info("═" * 60)
logger.info("🎖️  Military Pass AI Engine v%s — Starting...", AI_ENGINE_VERSION)
logger.info("═" * 60)
_startup_results = initialize_models()
logger.info("Startup complete: %s", _startup_results)


# ══════════════════════════════════════════════════════════════════════════════
# Gradio Interface Functions
# ══════════════════════════════════════════════════════════════════════════════

def health_check_fn() -> dict:
    result = _engine_health_check()
    result["startup_results"] = _startup_results
    return result


def face_swap_fn(frame_b64: str, avatar_embedding: str, enhance: bool, align_skin: bool, quality: str) -> str:
    if not frame_b64 or not frame_b64.strip():
        return json.dumps({"success": False, "error": "frame_b64 is required"})
    if "," in frame_b64:
        frame_b64 = frame_b64.split(",", 1)[1]
    try:
        embedding = json.loads(avatar_embedding) if isinstance(avatar_embedding, str) else avatar_embedding
    except json.JSONDecodeError:
        return json.dumps({"success": False, "error": "avatar_embedding must be valid JSON array of 512 floats"})
    result = face_swap(frame_b64, embedding, enhance, align_skin, quality)
    return json.dumps(result)


def voice_transform_fn(audio_b64: str, preset: str, pitch_override: float, speed_override: float) -> str:
    if not audio_b64 or not audio_b64.strip():
        return json.dumps({"success": False, "error": "audio_b64 is required"})
    if "," in audio_b64:
        audio_b64 = audio_b64.split(",", 1)[1]
    result = voice_transform(
        audio_b64,
        preset,
        pitch_override if pitch_override != 0 else None,
        speed_override if speed_override != 0 else None,
    )
    return json.dumps(result)


def voice_train_fn(audio_files_b64: str, model_id: str) -> str:
    if not audio_files_b64 or not audio_files_b64.strip():
        return json.dumps({"success": False, "error": "audio_files_b64 is required"})
    try:
        files = json.loads(audio_files_b64) if isinstance(audio_files_b64, str) else audio_files_b64
    except json.JSONDecodeError:
        return json.dumps({"success": False, "error": "audio_files_b64 must be a JSON array of base64 strings"})
    if not model_id:
        return json.dumps({"success": False, "error": "model_id is required"})
    result = train_voice_model(files, model_id)
    return json.dumps(result)


# ── Warmup ─────────────────────────────────────────────────────────────────────
_last_warmup_time: float = 0.0
WARMUP_COOLDOWN_SECS: int = 600


def warmup_fn() -> dict:
    global _last_warmup_time
    elapsed = time.time() - _last_warmup_time
    if elapsed < WARMUP_COOLDOWN_SECS:
        remaining = int(WARMUP_COOLDOWN_SECS - elapsed)
        return {
            "status": "skipped",
            "reason": "cooldown",
            "seconds_remaining": remaining,
        }
    try:
        import base64 as b64mod
        from PIL import Image as _Image
        img = _Image.new("RGB", (256, 256), (128, 128, 128))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        tiny_b64 = b64mod.b64encode(buf.getvalue()).decode()

        # Warmup face swap with dummy embedding
        dummy_emb = [0.0] * 512
        result = face_swap(tiny_b64, dummy_emb, enhance=False, align_skin=False, quality="fast")
        _last_warmup_time = time.time()
        return {
            "status": "warmed_up",
            "face_swap": result.get("success", False),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    except Exception as exc:
        logger.warning("Warmup failed (non-critical): %s", exc)
        return {"status": "warmup_failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# Gradio App
# ══════════════════════════════════════════════════════════════════════════════

with gr.Blocks(
    title="Military Pass AI Engine",
    theme=gr.themes.Soft(primary_hue="blue", secondary_hue="cyan"),
) as demo:
    gr.Markdown(
        """
        # 🎖️ Military Pass AI Engine
        **Production ZeroGPU AI Service** — `v""" + AI_ENGINE_VERSION + """`

        Powers the Military Pass platform with:
        - 🎭 Real-time face swap (InsightFace inswapper_128 + GFPGAN v1.4)
        - 🎙️ Voice transformation (WORLD vocoder, 5 military presets)
        - 🧠 Custom voice training (HuBERT + FAISS)

        > This is a machine-to-machine API space.
        > The Next.js frontend calls these endpoints via `/api/ai/`.
        > Existing Modal.com workers continue to serve production traffic.
        """
    )

    with gr.Tab("Health"):
        health_btn = gr.Button("🩺 Check Health", variant="primary")
        health_output = gr.JSON(label="Health Status")
        health_btn.click(fn=health_check_fn, inputs=[], outputs=[health_output], api_name="health_check")

    with gr.Tab("Face Swap"):
        gr.Markdown("Upload a base64-encoded frame and 512-dim avatar embedding for face swap.")
        frame_input = gr.Textbox(label="Base64 Frame Image", placeholder="data:image/jpeg;base64,...", lines=3)
        embedding_input = gr.Textbox(label="Avatar Embedding (JSON array of 512 floats)", lines=3)
        enhance_input = gr.Checkbox(label="GFPGAN Enhance", value=True)
        align_input = gr.Checkbox(label="Skin Tone Alignment", value=True)
        quality_input = gr.Dropdown(choices=["fast", "balanced", "ultra"], value="balanced", label="Quality Mode")
        swap_btn = gr.Button("Perform Face Swap", variant="primary")
        swap_output = gr.JSON(label="Result")
        swap_btn.click(
            fn=face_swap_fn,
            inputs=[frame_input, embedding_input, enhance_input, align_input, quality_input],
            outputs=[swap_output],
            api_name="face_swap",
        )

    with gr.Tab("Voice Transform"):
        gr.Markdown("Transform voice using WORLD vocoder with military-grade presets.")
        audio_input = gr.Textbox(label="Base64 Audio (WAV/PCM 16kHz)", placeholder="data:audio/wav;base64,...", lines=3)
        preset_input = gr.Dropdown(
            choices=["commander", "ghost", "operative", "recon", "ranger"],
            value="operative",
            label="Voice Preset",
        )
        pitch_input = gr.Slider(-12, 12, value=0, step=1, label="Pitch Override (semitones, 0=preset)")
        speed_input = gr.Slider(0.5, 2.0, value=0, step=0.05, label="Speed Override (0=preset)")
        voice_btn = gr.Button("Transform Voice", variant="primary")
        voice_output = gr.JSON(label="Result")
        voice_btn.click(
            fn=voice_transform_fn,
            inputs=[audio_input, preset_input, pitch_input, speed_input],
            outputs=[voice_output],
            api_name="voice_transform",
        )

    with gr.Tab("Voice Training"):
        gr.Markdown("Train a custom voice model from audio samples (up to 10 files).")
        train_audio_input = gr.Textbox(
            label="Audio Files (JSON array of base64 strings)",
            placeholder='["data:audio/wav;base64,...", "data:audio/wav;base64,..."]',
            lines=5,
        )
        model_id_input = gr.Textbox(label="Model ID", placeholder="unique-model-uuid")
        train_btn = gr.Button("Train Voice Model", variant="primary")
        train_output = gr.JSON(label="Training Result")
        train_btn.click(
            fn=voice_train_fn,
            inputs=[train_audio_input, model_id_input],
            outputs=[train_output],
            api_name="voice_train",
        )

    with gr.Tab("Warmup"):
        gr.Markdown(
            "> Called by CI/CD after deploy to pre-warm GPU memory.\n"
            "> Prevents cold-start for first user request. 10-min cooldown."
        )
        warmup_btn = gr.Button("🔥 Run GPU Warmup", variant="secondary")
        warmup_output = gr.JSON(label="Warmup Result")
        warmup_btn.click(fn=warmup_fn, inputs=[], outputs=[warmup_output], api_name="warmup")


if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 7860)),
        show_api=True,
    )
