import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserCredits } from "@/lib/actions";
import { getPerformanceMonitor } from "@/lib/performanceMonitor";
import { swapFace, getBackendConfig } from "@/lib/aiBackend";

/* ─── Config ─────────────────────────────────────────────────── */
const MAX_FRAME_BYTES = 512 * 1024;   // 512KB max per frame

/* ─── Performance Monitoring ─────────────────────────────────── */
const perfMonitor = getPerformanceMonitor();

export type QualityMode = "fast" | "balanced" | "ultra";

/* ─── POST /api/ai/face-swap ──────────────────────────────────── */
export async function POST(request: NextRequest) {
  const endOperation = perfMonitor.startOperation('face_swap');
  
  try {
    // 1. Auth
    const authStart = performance.now();
    const user = await getUser();
    const authDuration = performance.now() - authStart;
    perfMonitor.track('auth_check', authDuration);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Credit gate
    const creditStart = performance.now();
    const credits = await getUserCredits(user.id);
    const creditDuration = performance.now() - creditStart;
    perfMonitor.track('credit_check', creditDuration);
    
    if (!credits || credits.balance <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "NO_CREDITS" },
        { status: 402 }
      );
    }

    // 3. Parse body
    const body = await request.json();
    const {
      frame_b64,
      avatar_embedding,
      enhance    = true,
      align_skin = true,
      quality    = "balanced" as QualityMode,
    } = body;

    if (!frame_b64) {
      return NextResponse.json({ error: "Missing frame_b64" }, { status: 400 });
    }
    if (!avatar_embedding || !Array.isArray(avatar_embedding) || avatar_embedding.length === 0) {
      return NextResponse.json({ error: "Missing avatar_embedding" }, { status: 400 });
    }

    // Normalize embedding to exactly 512 dimensions (pad with zeros or truncate)
    let normalizedEmbedding = avatar_embedding;
    if (avatar_embedding.length !== 512) {
      if (avatar_embedding.length < 512) {
        normalizedEmbedding = [...avatar_embedding, ...new Array(512 - avatar_embedding.length).fill(0)];
      } else {
        normalizedEmbedding = avatar_embedding.slice(0, 512);
      }
      console.warn(`[face-swap] Embedding normalized from ${avatar_embedding.length} to 512 dimensions`);
    }
    if (!["fast", "balanced", "ultra"].includes(quality)) {
      return NextResponse.json(
        { error: "quality must be fast | balanced | ultra" },
        { status: 400 }
      );
    }

    // 4. Frame size guard
    const frameSizeBytes = Buffer.byteLength(frame_b64, "base64");
    if (frameSizeBytes > MAX_FRAME_BYTES) {
      return NextResponse.json(
        { error: `Frame too large: ${(frameSizeBytes / 1024).toFixed(1)}KB. Max: 512KB` },
        { status: 413 }
      );
    }

    // 5. Run through the prioritized AI backend chain:
    //    Hugging Face ZeroGPU Space → Modal.com → dev-echo (never throws)
    const chainStart = performance.now();
    const result = await swapFace({
      frame_b64,
      avatar_embedding: normalizedEmbedding,
      enhance,
      align_skin,
      quality,
    });
    const chainDuration = performance.now() - chainStart;
    perfMonitor.track('ai_backend_chain', chainDuration, {
      quality, enhance, align_skin, backend: result.backend,
    });

    if (result.latency_ms) {
      perfMonitor.track(`${result.backend}_processing`, result.latency_ms, { quality });
    }

    endOperation();

    return NextResponse.json({
      ...result,
      quality,
      align_skin,
      server_latency_ms: chainDuration.toFixed(2),
    });

  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      perfMonitor.trackError('face_swap', new Error('Face swap timed out'));
      return NextResponse.json({ error: "Face swap timed out" }, { status: 504 });
    }
    console.error("[face-swap]", err);
    perfMonitor.trackError('face_swap', err as Error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── GET /api/ai/face-swap — health & performance ─────────────────────────── */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';
  
  if (action === 'performance') {
    // Return performance metrics
    const report = perfMonitor.getReport();
    return NextResponse.json({ 
      status: "operational",
      performance: report,
      timestamp: new Date().toISOString()
    });
  }
  
  return NextResponse.json({ status: "operational", backend_chain: getBackendConfig() });
}
