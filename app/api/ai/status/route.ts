import { NextResponse } from "next/server";
import { getBackendConfig } from "@/lib/aiBackend";

interface WorkerStatus {
  name: string;
  url: string;
  status: "operational" | "degraded" | "offline" | "not_configured";
  latency_ms?: number;
  details?: Record<string, unknown>;
}

const MODAL_TOKEN = process.env.MODAL_AUTH_TOKEN ?? "";

/* ─── GET /api/ai/status ─────────────────────────────────── */
export async function GET() {
  const { priority, hf_space_url, modal_configured } = getBackendConfig();
  const MODAL_FACE_SWAP_URL = process.env.MODAL_FACE_SWAP_URL ?? "";
  const MODAL_VOICE_URL     = process.env.MODAL_VOICE_URL     ?? "";

  async function checkHFSpace(): Promise<WorkerStatus> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${hf_space_url}/gradio_api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - t0;
      if (res.ok) return { name: "huggingface_ai_space", url: hf_space_url, status: "operational", latency_ms: latency };
      return { name: "huggingface_ai_space", url: hf_space_url, status: "degraded", latency_ms: latency };
    } catch {
      return { name: "huggingface_ai_space", url: hf_space_url, status: "offline" };
    }
  }

  async function checkModalWorker(name: string, url: string): Promise<WorkerStatus> {
    if (!url) return { name, url: "not_configured", status: "not_configured" };
    const t0 = Date.now();
    try {
      const res = await fetch(`${url}/health`, {
        headers: { Authorization: `Bearer ${MODAL_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      const latency = Date.now() - t0;
      if (res.ok) {
        const details = await res.json();
        return { name, url, status: "operational", latency_ms: latency, details };
      }
      return { name, url, status: "degraded", latency_ms: latency };
    } catch {
      return { name, url, status: "offline" };
    }
  }

  const [hfStatus, faceStatus, voiceStatus] = await Promise.all([
    checkHFSpace(),
    checkModalWorker("modal_face_swap", MODAL_FACE_SWAP_URL),
    checkModalWorker("modal_voice", MODAL_VOICE_URL),
  ]);

  const primaryHealthy = priority[0] === "hf" ? hfStatus.status === "operational" : modal_configured;
  const anyHealthy = hfStatus.status === "operational" || faceStatus.status === "operational" || voiceStatus.status === "operational";
  const overallStatus = primaryHealthy ? "operational" : anyHealthy ? "degraded" : "offline";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    backend_chain: { priority, hf_space_url, modal_configured },
    workers: {
      huggingface: hfStatus,
      modal_face_swap: faceStatus,
      modal_voice: voiceStatus,
    },
    platform: {
      nextjs: process.env.npm_package_version ?? "unknown",
      node:   process.version,
    },
  });
}
