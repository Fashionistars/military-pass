import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "military-pass-frontend",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "production",
    supabase: {
      configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    },
    aiEngine: {
      url: process.env.NEXT_PUBLIC_AI_ENGINE_URL || "not-configured",
    },
    posthog: {
      configured: !!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    },
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : "unknown",
  };

  return NextResponse.json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
