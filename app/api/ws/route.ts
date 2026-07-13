/**
 * Military Pass — WebSocket HTTP Status & Fallback Route
 * ======================================================
 * WebSocket connections are handled by server.js (using ws library)
 * in Docker/HF Spaces environments. This route serves as:
 *   - GET:  Status endpoint reporting transport availability
 *   - POST: HTTP fallback for real-time messages on Vercel serverless
 *
 * Standardized on 'ws' protocol per unification plan Rec 10.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const isWebSocketEnabled = process.env.WEBSOCKET_ENABLED === 'true';

/**
 * GET /api/ws — Transport status endpoint
 * Returns WebSocket availability and AI endpoint info.
 */
export async function GET() {
  return NextResponse.json({
    status: isWebSocketEnabled ? 'operational' : 'http_fallback',
    websocket: isWebSocketEnabled ? 'ready' : 'not_supported',
    transport: isWebSocketEnabled ? 'ws' : 'http',
    message: isWebSocketEnabled
      ? 'WebSocket server running via server.js on port 7860'
      : 'WebSocket not available on serverless. Use HTTP API routes.',
    endpoints: {
      faceSwap: '/api/ai/face-swap',
      voice: '/api/ai/voice',
      status: '/api/ai/status',
    },
  });
}

/**
 * POST /api/ws — HTTP fallback for real-time messages
 * Forwards frame/voice requests to AI backend when WebSocket is unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: type, payload' },
        { status: 400 }
      );
    }

    const aiBackendUrl = process.env.HF_AI_SPACE_URL || process.env.NEXT_PUBLIC_HF_AI_SPACE_URL;
    if (!aiBackendUrl) {
      return NextResponse.json(
        { error: 'AI backend URL not configured' },
        { status: 503 }
      );
    }

    const endpoint = type === 'frame_request' ? '/face_swap' : type === 'voice_request' ? '/voice_transform' : null;
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown message type: ${type}` },
        { status: 400 }
      );
    }

    const response = await fetch(`${aiBackendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AI backend error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Request processing failed' },
      { status: 500 }
    );
  }
}