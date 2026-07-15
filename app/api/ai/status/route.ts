import { NextResponse } from "next/server";
import { getBackendConfig } from "@/lib/aiBackend";

interface WorkerStatus {
  name: string;
  url: string;
  status: "operational" | "degraded" | "offline" | "not_configured";
  latency_ms?: number;
  details?: Record<string, unknown>;
}

/* ─── GET /api/ai/status ─────────────────────────────────── */
export async function GET() {
  const { priority, hf_space_url } = getBackendConfig();

  async function checkHFSpace(): Promise<WorkerStatus> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${hf_space_url}/`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - t0;
      if (res.ok) return { name: "huggingface_ai_space", url: hf_space_url, status: "operational", latency_ms: latency };
      return { name: "huggingface_ai_space", url: hf_space_url, status: "degraded", latency_ms: latency };
    } catch {
      return { name: "huggingface_ai_space", url: hf_space_url, status: "offline" };
    }
  }

  const [hfStatus] = await Promise.all([
    checkHFSpace(),
  ]);

  const primaryHealthy = priority[0] === "hf" ? hfStatus.status === "operational" : false;
  const overallStatus = primaryHealthy ? "operational" : "offline";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    backend_chain: { priority, hf_space_url },
    workers: {
      huggingface: hfStatus,
    },
    platform: {
      nextjs: process.env.npm_package_version ?? "unknown",
      node:   process.version,
    },
  });
}
