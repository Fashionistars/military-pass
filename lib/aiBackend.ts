/**
 * Military Pass — AI Backend Chain (Server-Side)
 * ===============================================
 * Unified, prioritized AI inference backend resolver.
 *
 * Uses Hugging Face ZeroGPU Space (Gradio API) as the sole AI engine.
 * If the HF engine fails, a dev-mode echo result is returned so the
 * UI keeps functioning.
 *
 * Used by:
 *   - app/api/ai/face-swap/route.ts   (HTTP path)
 *   - app/api/ai/voice/route.ts       (HTTP path)
 *   - app/api/ws/route.ts             (HTTP fallback for WS clients)
 *   - server.js mirrors this logic in plain JS for the WS server
 */

// ── Configuration ────────────────────────────────────────────────

const HF_AI_SPACE_URL =
  process.env.HF_AI_SPACE_URL ??
  process.env.NEXT_PUBLIC_HF_AI_SPACE_URL ??
  "https://fashionistar-military-pass-ai.hf.space";

const BACKEND_PRIORITY = ["hf"];

const GRADIO_TIMEOUT_MS = 60_000;

// ── Types ────────────────────────────────────────────────────────

export interface FaceSwapParams {
  frame_b64: string;
  avatar_embedding: number[];
  quality?: string;
  enhance?: boolean;
  align_skin?: boolean;
}

export interface FaceSwapResult {
  result_b64: string;
  latency_ms: number;
  faces_detected?: number;
  quality: string;
  backend: string;
  dev_mode?: boolean;
}

export interface VoiceParams {
  audio_b64: string;
  preset?: string;
  pitch_override?: number | null;
  speed_override?: number | null;
}

export interface VoiceResult {
  audio_b64: string;
  latency_ms: number;
  preset: string;
  backend: string;
  dev_mode?: boolean;
}

// ── Gradio API helper (Gradio 5 two-step call protocol) ──────────

async function callGradioAPI(
  baseUrl: string,
  apiName: string,
  data: unknown[],
  timeoutMs: number = GRADIO_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Step 1: submit the call → receive event_id
    const submitRes = await fetch(`${baseUrl}/gradio_api/call/${apiName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal: controller.signal,
    });

    if (!submitRes.ok) {
      throw new Error(`Gradio submit failed: HTTP ${submitRes.status}`);
    }

    const { event_id } = (await submitRes.json()) as { event_id?: string };
    if (!event_id) {
      throw new Error("Gradio submit returned no event_id");
    }

    // Step 2: stream the result (SSE) and extract the final data payload
    const resultRes = await fetch(
      `${baseUrl}/gradio_api/call/${apiName}/${event_id}`,
      { signal: controller.signal },
    );

    if (!resultRes.ok) {
      throw new Error(`Gradio result fetch failed: HTTP ${resultRes.status}`);
    }

    const sseText = await resultRes.text();

    // Parse SSE — take the last `data:` line that parses as JSON
    let lastData: unknown = null;
    for (const line of sseText.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        const raw = trimmed.slice(5).trim();
        try {
          lastData = JSON.parse(raw);
        } catch {
          /* non-JSON keep-alive lines are ignored */
        }
      }
    }

    if (lastData === null) {
      throw new Error("Gradio stream produced no data payload");
    }

    // Gradio returns an array of outputs — unwrap the first element
    const first = Array.isArray(lastData) ? lastData[0] : lastData;

    // Engine fns return JSON strings — parse defensively
    if (typeof first === "string") {
      try {
        return JSON.parse(first);
      } catch {
        return first;
      }
    }
    return first;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Face swap providers ──────────────────────────────────────────

async function faceSwapViaHF(params: FaceSwapParams): Promise<FaceSwapResult> {
  const t0 = Date.now();
  const out = (await callGradioAPI(HF_AI_SPACE_URL, "face_swap", [
    params.frame_b64,
    JSON.stringify(params.avatar_embedding),
    params.enhance ?? true,
    params.align_skin ?? true,
    params.quality ?? "balanced",
  ])) as Record<string, unknown>;

  const resultB64 =
    (out?.result_b64 as string) ?? (out?.frame_b64 as string) ?? "";
  if (!resultB64) {
    throw new Error(
      `HF face_swap returned no result_b64 (${JSON.stringify(out).slice(0, 200)})`,
    );
  }

  return {
    result_b64: resultB64,
    latency_ms: Date.now() - t0,
    faces_detected: (out?.faces_detected as number) ?? undefined,
    quality: params.quality ?? "balanced",
    backend: "huggingface",
  };
}

// ── Voice providers ──────────────────────────────────────────────

async function voiceViaHF(params: VoiceParams): Promise<VoiceResult> {
  const t0 = Date.now();
  const out = (await callGradioAPI(HF_AI_SPACE_URL, "voice_transform", [
    params.audio_b64,
    params.preset ?? "operative",
    params.pitch_override ?? 0,
    params.speed_override ?? 0,
  ])) as Record<string, unknown>;

  const audioB64 = (out?.audio_b64 as string) ?? "";
  if (!audioB64) {
    throw new Error(
      `HF voice_transform returned no audio_b64 (${JSON.stringify(out).slice(0, 200)})`,
    );
  }

  return {
    audio_b64: audioB64,
    latency_ms: Date.now() - t0,
    preset: params.preset ?? "operative",
    backend: "huggingface",
  };
}

// ── Public chain API ─────────────────────────────────────────────

/**
 * Run face swap through the prioritized backend chain.
 * Falls back to a dev-mode echo if every provider fails.
 */
export async function swapFace(params: FaceSwapParams): Promise<FaceSwapResult> {
  const providers: Record<string, (p: FaceSwapParams) => Promise<FaceSwapResult>> = {
    hf: faceSwapViaHF,
  };

  const errors: string[] = [];
  for (const name of BACKEND_PRIORITY) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      return await provider(params);
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
    }
  }

  console.warn("[aiBackend] All face swap providers failed:", errors.join(" | "));
  return {
    result_b64: params.frame_b64,
    latency_ms: 0,
    quality: params.quality ?? "balanced",
    backend: "dev-echo",
    dev_mode: true,
  };
}

/**
 * Run voice transformation through the prioritized backend chain.
 * Falls back to a dev-mode echo if every provider fails.
 */
export async function transformVoice(params: VoiceParams): Promise<VoiceResult> {
  const providers: Record<string, (p: VoiceParams) => Promise<VoiceResult>> = {
    hf: voiceViaHF,
  };

  const errors: string[] = [];
  for (const name of BACKEND_PRIORITY) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      return await provider(params);
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
    }
  }

  console.warn("[aiBackend] All voice providers failed:", errors.join(" | "));
  return {
    audio_b64: params.audio_b64,
    latency_ms: 0,
    preset: params.preset ?? "operative",
    backend: "dev-echo",
    dev_mode: true,
  };
}

/**
 * Health snapshot of the configured backends (used by /api/ws GET).
 */
export function getBackendConfig() {
  return {
    priority: BACKEND_PRIORITY,
    hf_space_url: HF_AI_SPACE_URL,
  };
}
