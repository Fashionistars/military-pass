import { NextResponse } from "next/server";
import { getUser } from "@/lib/actions";

/**
 * POST /api/ai/warmup
 * Sends a warm-up request to the HF ZeroGPU Space to activate the GPU
 * before the first frame is processed. This reduces cold-start latency
 * from ~60s down to <1s for the first face swap call.
 */
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const HF_AI_SPACE_URL =
      process.env.HF_AI_SPACE_URL ??
      process.env.NEXT_PUBLIC_HF_AI_SPACE_URL ??
      "https://fashionistar-military-pass-ai.hf.space";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      // Send a minimal warm-up call to the Gradio API
      // This activates the ZeroGPU allocation
      const warmupRes = await fetch(`${HF_AI_SPACE_URL}/gradio_api/call/face_swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            "", // empty frame_b64 — just warming up
            JSON.stringify(new Array(512).fill(0)),
            true,
            true,
            "fast",
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (warmupRes.ok) {
        const { event_id } = await warmupRes.json().catch(() => ({}));
        // Consume the result to complete the warm-up
        if (event_id) {
          await fetch(`${HF_AI_SPACE_URL}/gradio_api/call/face_swap/${event_id}`, {
            signal: AbortSignal.timeout(30_000),
          }).catch(() => {}); // non-blocking — we just want to trigger GPU allocation
        }
        return NextResponse.json({
          status: "warmed_up",
          backend: "huggingface",
          message: "ZeroGPU activated successfully",
        });
      }

      return NextResponse.json({
        status: "partial",
        message: `Warm-up returned HTTP ${warmupRes.status} — GPU may still be cold`,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({
        status: "failed",
        message: `Warm-up failed: ${msg}. AI backend will cold-start on first frame.`,
      }, { status: 200 }); // non-fatal — studio can still proceed
    }
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
