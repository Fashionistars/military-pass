"""
Military Pass — ZeroGPU AI Engine for Hugging Face Spaces
==========================================================

Hosts GPU-intensive AI inference for the Military Pass platform on HF ZeroGPU.
This is a standalone entry point that does NOT disrupt existing Modal.com deployments.

Models:
  - Face Swap:    InsightFace inswapper_128 + GFPGAN v1.4 restoration
  - Voice Transform: WORLD vocoder pitch/formant/speed shift + presets
  - Voice Training:  HuBERT feature extraction + FAISS index (custom voice models)

ZeroGPU Architecture:
  - Models MUST be loaded at MODULE LEVEL onto 'cuda'
  - @spaces.GPU decorator requests a real A10G GPU for each function call
  - GPU is released after each call (ZeroGPU is shared, not persistent)
  - Never lazy-load inside @spaces.GPU — breaks CUDA tensor transfer

External URL: https://fashionistar-military-pass-ai.hf.space
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
from typing import Any, Literal

import numpy as np

logger = logging.getLogger("militarypass.zerogpu_engine")

# ── Constants ──────────────────────────────────────────────────────────────────
AI_ENGINE_VERSION = "1.0.0"

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODAL_AUTH_TOKEN = os.environ.get("MODAL_AUTH_TOKEN", "")
MODAL_FACE_SWAP_URL = os.environ.get("MODAL_FACE_SWAP_URL", "")
MODAL_VOICE_URL = os.environ.get("MODAL_VOICE_URL", "")

# Quality modes for face swap
QualityMode = Literal["fast", "balanced", "ultra"]

# Voice presets
VALID_PRESETS = {
    "commander": {"pitch_shift": -3, "speed_factor": 0.92},
    "ghost":     {"pitch_shift": -1, "speed_factor": 0.88},
    "operative": {"pitch_shift":  0, "speed_factor": 1.00},
    "recon":     {"pitch_shift":  2, "speed_factor": 1.10},
    "ranger":    {"pitch_shift": -5, "speed_factor": 0.85},
}

# Prevent MediaPipe from trying to initialise EGL/OpenGL at import time
os.environ.setdefault("MEDIAPIPE_DISABLE_GPU", "1")

# ── ZeroGPU Decorator (no-op outside HF Spaces) ────────────────────────────────
try:
    import spaces  # noqa: F401
    _HAS_SPACES = True
    logger.info("Running inside HF Spaces — ZeroGPU available")
except ImportError:
    class _NoOpSpaces:
        def GPU(self, fn=None, duration=60):
            if fn is not None:
                return fn
            return lambda f: f
    spaces = _NoOpSpaces()  # type: ignore[assignment]
    _HAS_SPACES = False

# ── Module-level model handles ─────────────────────────────────────────────────
_insightface_app = None
_insightface_swapper = None
_gfpgan_enhancer = None
_mediapipe_mesh = None
_world_vocoder = None
_hubert_model = None
_hubert_processor = None
_models_initialized = False


def _load_insightface() -> bool:
    """Load InsightFace face analysis + inswapper_128 for face swap."""
    global _insightface_app, _insightface_swapper
    try:
        import insightface
        from insightface.app import FaceAnalysis

        _insightface_app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider"])
        _insightface_app.prepare(ctx_id=0, det_size=(640, 640))

        # Load inswapper_128.onnx
        from huggingface_hub import hf_hub_download
        import shutil

        model_dir = os.path.expanduser("~/.insightface/models")
        os.makedirs(model_dir, exist_ok=True)
        swapper_path = os.path.join(model_dir, "inswapper_128.onnx")

        if not os.path.exists(swapper_path):
            try:
                path = hf_hub_download(repo_id="Patil/inswapper", filename="inswapper_128.onnx")
                shutil.copy(path, swapper_path)
            except Exception:
                path = hf_hub_download(repo_id="Gourieff/ReActor", filename="models/inswapper_128.onnx")
                shutil.copy(path, swapper_path)

        _insightface_swapper = insightface.model_zoo.get_model(swapper_path)
        logger.info("✅ InsightFace + inswapper_128 loaded on CUDA")
        return True
    except Exception as exc:
        logger.warning("⚠️  InsightFace load failed (non-fatal): %s", exc)
        return False


def _load_gfpgan() -> bool:
    """Load GFPGAN v1.4 for face restoration."""
    global _gfpgan_enhancer
    try:
        # ── Compatibility shim for torchvision >= 0.17 ───────────────
        # GFPGAN 1.3.8 / basicsr 1.4.2 import torchvision.transforms.functional_tensor
        # which was removed in torchvision 0.17+. We alias it to the new location.
        import torchvision.transforms as _vt
        if not hasattr(_vt, "functional_tensor"):
            try:
                import torchvision.transforms.functional_tensor as _ft  # noqa: F401
            except ImportError:
                # Create the missing module alias
                import types as _types
                _mod = _types.ModuleType("torchvision.transforms.functional_tensor")
                _mod.__dict__.update({
                    k: v for k, v in vars(_vt.functional).items()
                    if not k.startswith("_")
                })
                import sys as _sys
                _sys.modules["torchvision.transforms.functional_tensor"] = _mod
                _vt.functional_tensor = _mod

        from gfpgan import GFPGANer

        # Download GFPGAN v1.4 weights
        weight_path = "/tmp/GFPGANv1.4.pth"
        if not os.path.exists(weight_path):
            import urllib.request
            url = "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth"
            urllib.request.urlretrieve(url, weight_path)

        _gfpgan_enhancer = GFPGANer(
            model_path=weight_path,
            upscale=1,
            arch="clean",
            channel_multiplier=2,
            bg_upsampler=None,
        )
        logger.info("✅ GFPGAN v1.4 loaded for face restoration")
        return True
    except Exception as exc:
        logger.warning("⚠️  GFPGAN load failed (non-fatal): %s", exc)
        return False


def _load_mediapipe_mesh() -> bool:
    """Load MediaPipe face mesh for precise face boundary detection."""
    global _mediapipe_mesh
    try:
        import mediapipe as mp

        _mediapipe_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
        logger.info("✅ MediaPipe face mesh loaded")
        return True
    except Exception as exc:
        logger.warning("⚠️  MediaPipe face mesh load failed (non-fatal): %s", exc)
        return False


def _load_world_vocoder() -> bool:
    """Load WORLD vocoder for voice transformation (CPU-based, no GPU needed)."""
    global _world_vocoder
    try:
        import pyworld as pw

        _world_vocoder = pw
        logger.info("✅ WORLD vocoder loaded (pyworld)")
        return True
    except Exception as exc:
        logger.warning("⚠️  WORLD vocoder load failed (non-fatal): %s", exc)
        return False


def _load_hubert() -> bool:
    """Load HuBERT for voice feature extraction (optional, for custom voice training)."""
    global _hubert_model, _hubert_processor
    try:
        import torch
        from transformers import HubertModel, Wav2Vec2FeatureExtractor

        _hubert_model = HubertModel.from_pretrained("facebook/hubert-base-ls960")
        _hubert_processor = Wav2Vec2FeatureExtractor.from_pretrained("facebook/hubert-base-ls960")
        _hubert_model = _hubert_model.to("cuda")
        _hubert_model.eval()
        logger.info("✅ HuBERT base loaded on CUDA for voice feature extraction")
        return True
    except Exception as exc:
        logger.warning("⚠️  HuBERT load failed (non-fatal): %s", exc)
        return False


def initialize_models() -> dict[str, bool]:
    """
    Load all models at startup (required BEFORE any @spaces.GPU call).
    Call this once at module level in app.py.
    """
    global _models_initialized

    results = {
        "insightface":    _load_insightface(),
        "gfpgan":         _load_gfpgan(),
        "mediapipe_mesh": _load_mediapipe_mesh(),
        "world_vocoder":  _load_world_vocoder(),
        "hubert":         _load_hubert(),
    }
    _models_initialized = True
    logger.info(
        "AI Engine v%s ready | InsightFace: %s  GFPGAN: %s  MediaPipe: %s  WORLD: %s  HuBERT: %s",
        AI_ENGINE_VERSION,
        "✅" if results["insightface"]    else "❌",
        "✅" if results["gfpgan"]         else "❌",
        "✅" if results["mediapipe_mesh"] else "❌",
        "✅" if results["world_vocoder"]  else "❌",
        "✅" if results["hubert"]         else "❌",
    )
    return results


# ── Face Swap ──────────────────────────────────────────────────────────────────

@spaces.GPU(duration=45)
def face_swap(
    frame_b64: str,
    avatar_embedding: list[float],
    enhance: bool = True,
    align_skin: bool = True,
    quality: str = "balanced",
) -> dict[str, Any]:
    """
    Perform face swap on a base64-encoded frame using InsightFace inswapper_128.

    Args:
        frame_b64: Base64-encoded JPEG/PNG frame
        avatar_embedding: 512-dim face embedding vector
        enhance: Apply GFPGAN face restoration
        align_skin: Apply skin tone histogram matching
        quality: "fast" | "balanced" | "ultra"

    Returns:
        dict with result_b64, latency_ms, faces_detected, quality
    """
    if _insightface_app is None or _insightface_swapper is None:
        return {"success": False, "error": "InsightFace models not available"}

    try:
        import cv2

        # Decode frame
        frame_bytes = base64.b64decode(frame_b64)
        frame_array = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
        if frame is None:
            return {"success": False, "error": "Failed to decode frame image"}

        t0 = time.time()

        # Detect faces
        faces = _insightface_app.get(frame)
        if not faces:
            return {"success": False, "error": "No faces detected in frame"}

        # Select largest face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # Convert avatar embedding to numpy
        embedding = np.array(avatar_embedding, dtype=np.float32)

        # Perform face swap
        result_frame = _insightface_swapper.get(frame, face, embedding)

        # Skin tone alignment (LAB histogram matching)
        if align_skin and quality in ("balanced", "ultra"):
            try:
                result_frame = _align_skin_tone(frame, result_frame, face.bbox)
            except Exception as e:
                logger.debug("Skin alignment skipped: %s", e)

        # GFPGAN face restoration
        if enhance and _gfpgan_enhancer is not None and quality in ("balanced", "ultra"):
            try:
                _, _, restored = _gfpgan_enhancer.enhance(
                    result_frame,
                    paste_back=True,
                    weight=0.7 if quality == "balanced" else 0.5,
                )
                if restored is not None:
                    result_frame = restored
            except Exception as e:
                logger.debug("GFPGAN enhancement skipped: %s", e)

        # Poisson seamless blending (ultra only)
        if quality == "ultra":
            try:
                result_frame = _poisson_blend(frame, result_frame, face.bbox)
            except Exception as e:
                logger.debug("Poisson blend skipped: %s", e)

        latency_ms = (time.time() - t0) * 1000

        # Encode result
        _, result_buf = cv2.imencode(
            ".jpg",
            result_frame,
            [cv2.IMWRITE_JPEG_QUALITY, 80 if quality == "fast" else 88 if quality == "balanced" else 95],
        )
        result_b64 = base64.b64encode(result_buf).decode()

        return {
            "success": True,
            "result_b64": result_b64,
            "latency_ms": round(latency_ms, 1),
            "faces_detected": len(faces),
            "quality": quality,
            "enhance": enhance,
            "align_skin": align_skin,
        }

    except Exception as exc:
        logger.error("Face swap error: %s", exc, exc_info=True)
        return {"success": False, "error": str(exc)}


def _align_skin_tone(original: np.ndarray, swapped: np.ndarray, bbox: np.ndarray) -> np.ndarray:
    """Align skin tone using LAB color space histogram matching."""
    import cv2

    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(original.shape[1], x2), min(original.shape[0], y2)

    orig_roi = original[y1:y2, x1:x2]
    swap_roi = swapped[y1:y2, x1:x2]

    if orig_roi.size == 0 or swap_roi.size == 0:
        return swapped

    orig_lab = cv2.cvtColor(orig_roi, cv2.COLOR_BGR2LAB)
    swap_lab = cv2.cvtColor(swap_roi, cv2.COLOR_BGR2LAB)

    for i in range(3):
        orig_mean, orig_std = orig_lab[:, :, i].mean(), orig_lab[:, :, i].std()
        swap_mean, swap_std = swap_lab[:, :, i].mean(), swap_lab[:, :, i].std()
        if swap_std > 0:
            swap_lab[:, :, i] = ((swap_lab[:, :, i] - swap_mean) / swap_std * orig_std + orig_mean)
            swap_lab[:, :, i] = np.clip(swap_lab[:, :, i], 0, 255)

    aligned = cv2.cvtColor(swap_lab, cv2.COLOR_LAB2BGR)
    result = swapped.copy()
    result[y1:y2, x1:x2] = aligned
    return result


def _poisson_blend(original: np.ndarray, swapped: np.ndarray, bbox: np.ndarray) -> np.ndarray:
    """Poisson seamless cloning for invisible boundary merge."""
    import cv2

    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(original.shape[1], x2), min(original.shape[0], y2)

    mask = np.zeros(original.shape[:2], dtype=np.uint8)
    mask[y1:y2, x1:x2] = 255

    center = ((x1 + x2) // 2, (y1 + y2) // 2)
    return cv2.seamlessClone(swapped, original, mask, center, cv2.NORMAL_CLONE)


# ── Voice Transform ────────────────────────────────────────────────────────────

@spaces.GPU(duration=20)
def voice_transform(
    audio_b64: str,
    preset: str = "operative",
    pitch_override: float | None = None,
    speed_override: float | None = None,
) -> dict[str, Any]:
    """
    Transform voice using WORLD vocoder with pitch/formant/speed shifting.

    Args:
        audio_b64: Base64-encoded audio (WAV/PCM 16kHz mono)
        preset: One of commander, ghost, operative, recon, ranger
        pitch_override: Override preset pitch shift (semitones)
        speed_override: Override preset speed factor

    Returns:
        dict with audio_b64 (transformed), latency_ms, preset
    """
    if _world_vocoder is None:
        return {"success": False, "error": "WORLD vocoder not available"}

    if preset not in VALID_PRESETS:
        return {"success": False, "error": f"Invalid preset: {preset}. Choose from: {list(VALID_PRESETS.keys())}"}

    try:
        import soundfile as sf

        # Decode audio
        audio_bytes = base64.b64decode(audio_b64)
        audio, sr = sf.read(io.BytesIO(audio_bytes))

        if audio.ndim > 1:
            audio = audio[:, 0]  # mono

        if sr != 16000:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000

        t0 = time.time()

        # Get preset params
        preset_cfg = VALID_PRESETS[preset]
        pitch_shift = pitch_override if pitch_override is not None else preset_cfg["pitch_shift"]
        speed_factor = speed_override if speed_override is not None else preset_cfg["speed_factor"]

        # WORLD analysis
        f0, t0_world = _world_vocoder.dio(audio.astype(np.float64), sr, frame_period=5.0)
        f0 = _world_vocoder.stonemask(audio.astype(np.float64), f0, t0_world, sr)
        sp = _world_vocoder.cheaptrick(audio.astype(np.float64), f0, t0_world, sr)
        ap = _world_vocoder.d4c(audio.astype(np.float64), f0, t0_world, sr)

        # Pitch shift
        if pitch_shift != 0:
            f0 = f0 * (2 ** (pitch_shift / 12.0))

        # Speed change (adjust frame period)
        frame_period = 5.0 / speed_factor

        # Synthesis
        transformed = _world_vocoder.synthesize(f0, sp, ap, len(audio), sr, frame_period=frame_period)

        latency_ms = (time.time() - t0) * 1000

        # Encode output
        out_buf = io.BytesIO()
        sf.write(out_buf, transformed, sr, format="WAV", subtype="FLOAT")
        out_b64 = base64.b64encode(out_buf.getvalue()).decode()

        return {
            "success": True,
            "audio_b64": out_b64,
            "latency_ms": round(latency_ms, 1),
            "preset": preset,
            "pitch_shift": pitch_shift,
            "speed_factor": speed_factor,
        }

    except Exception as exc:
        logger.error("Voice transform error: %s", exc, exc_info=True)
        return {"success": False, "error": str(exc)}


# ── Voice Training (HuBERT + FAISS) ────────────────────────────────────────────

@spaces.GPU(duration=120)
def train_voice_model(
    audio_files_b64: list[str],
    model_id: str,
) -> dict[str, Any]:
    """
    Train a custom voice model from audio samples using HuBERT + FAISS.

    Args:
        audio_files_b64: List of base64-encoded audio files (WAV/MP3, up to 10)
        model_id: Unique identifier for the trained model

    Returns:
        dict with success, model_id, num_vectors, training_time_ms
    """
    if _hubert_model is None or _hubert_processor is None:
        return {"success": False, "error": "HuBERT model not available for voice training"}

    try:
        import torch
        import soundfile as sf
        import librosa

        t0 = time.time()
        all_features = []

        for audio_b64 in audio_files_b64[:10]:  # max 10 files
            audio_bytes = base64.b64decode(audio_b64)
            audio, sr = sf.read(io.BytesIO(audio_bytes))

            if audio.ndim > 1:
                audio = audio[:, 0]

            if sr != 16000:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)

            # Extract HuBERT features
            inputs = _hubert_processor(audio, sampling_rate=16000, return_tensors="pt")
            input_values = inputs.input_values.to("cuda")

            with torch.no_grad():
                outputs = _hubert_model(input_values)
                features = outputs.last_hidden_state[0].cpu().numpy()  # (T, 768)

            all_features.append(features)

        # Concatenate all features
        all_features = np.concatenate(all_features, axis=0)

        # Build FAISS index
        import faiss

        dim = all_features.shape[1]
        index = faiss.IndexFlatL2(dim)
        index.add(all_features.astype(np.float32))

        # Save model (in production, save to Supabase Storage or Modal Volume)
        model_dir = f"/tmp/voice_models/{model_id}"
        os.makedirs(model_dir, exist_ok=True)
        faiss.write_index(index, os.path.join(model_dir, "index.faiss"))
        np.save(os.path.join(model_dir, "embeddings.npy"), all_features)

        training_time_ms = (time.time() - t0) * 1000

        return {
            "success": True,
            "model_id": model_id,
            "num_vectors": int(all_features.shape[0]),
            "dimension": dim,
            "training_time_ms": round(training_time_ms, 1),
            "model_path": model_dir,
        }

    except Exception as exc:
        logger.error("Voice training error: %s", exc, exc_info=True)
        return {"success": False, "error": str(exc)}


# ── Health Check ───────────────────────────────────────────────────────────────

def health_check() -> dict[str, Any]:
    """
    Returns AI Engine health status.
    Called by Military Pass frontend at /api/ai/status.
    """
    return {
        "status": "ok" if (_insightface_app or _world_vocoder) else "degraded",
        "service": "military-pass-ai-engine",
        "version": AI_ENGINE_VERSION,
        "models": {
            "insightface":    _insightface_app    is not None,
            "gfpgan":         _gfpgan_enhancer    is not None,
            "mediapipe_mesh": _mediapipe_mesh     is not None,
            "world_vocoder":  _world_vocoder      is not None,
            "hubert":         _hubert_model       is not None,
        },
        "gpu_available":      _HAS_SPACES,
        "models_initialized": _models_initialized,
        "voice_presets":      list(VALID_PRESETS.keys()),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
