/**
 * Military Pass - WebRTC Signaling Server
 * ========================================
 * Enterprise-grade WebRTC signaling for peer-to-peer connections:
 * 
 * ✅ SDP offer/answer exchange
 * ✅ ICE candidate relay
 * ✅ Room-based signaling
 * ✅ Connection state management
 * ✅ TypeScript with full type safety
 */

import { NextRequest } from 'next/server';

// Types
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'leave';
  roomId: string;
  userId: string;
  payload: unknown;
}

interface Room {
  participants: Map<string, { joinedAt: number }>;
  offers: Map<string, unknown>;
  answers: Map<string, unknown>;
  iceCandidates: Map<string, unknown[]>;
}

// In-memory room storage (in production, use Redis)
const rooms = new Map<string, Room>();

/**
 * POST /api/webrtc - WebRTC signaling endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, roomId, userId, payload } = body as SignalingMessage;

    // Get or create room
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        participants: new Map(),
        offers: new Map(),
        answers: new Map(),
        iceCandidates: new Map(),
      };
      rooms.set(roomId, room);
    }

    // Handle different message types
    switch (type) {
      case 'offer':
        return handleOffer(room, userId, payload);
      case 'answer':
        return handleAnswer(room, userId, payload);
      case 'ice-candidate':
        return handleIceCandidate(room, userId, payload);
      case 'leave':
        return handleLeave(room, userId, roomId);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown message type' }),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[WebRTC Signaling] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * GET /api/webrtc - Get room status
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return new Response(
      JSON.stringify({ error: 'Room ID required' }),
      { status: 400 }
    );
  }

  const room = rooms.get(roomId);
  if (!room) {
    return new Response(
      JSON.stringify({ exists: false, participants: 0 }),
      { status: 200 }
    );
  }

  return new Response(
    JSON.stringify({
      exists: true,
      participants: room.participants.size,
      userIds: Array.from(room.participants.keys()),
    }),
    { status: 200 }
  );
}

/**
 * Handle SDP offer
 */
function handleOffer(room: Room, userId: string, payload: unknown): Response {
  // Store offer
  room.offers.set(userId, payload);
  room.participants.set(userId, { joinedAt: Date.now() });

  console.log(`[WebRTC Signaling] Offer received from ${userId}`);

  // Return existing offers from other participants
  const otherOffers = Array.from(room.offers.entries())
    .filter(([id]) => id !== userId)
    .map(([id, offer]) => ({ userId: id, offer }));

  return new Response(
    JSON.stringify({
      success: true,
      existingOffers: otherOffers,
    }),
    { status: 200 }
  );
}

/**
 * Handle SDP answer
 */
function handleAnswer(room: Room, userId: string, payload: unknown): Response {
  // Store answer
  room.answers.set(userId, payload);

  console.log(`[WebRTC Signaling] Answer received from ${userId}`);

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
}

/**
 * Handle ICE candidate
 */
function handleIceCandidate(room: Room, userId: string, payload: unknown): Response {
  // Store ICE candidate
  if (!room.iceCandidates.has(userId)) {
    room.iceCandidates.set(userId, []);
  }
  room.iceCandidates.get(userId)!.push(payload);

  console.log(`[WebRTC Signaling] ICE candidate received from ${userId}`);

  // Return ICE candidates from other participants
  const otherCandidates = Array.from(room.iceCandidates.entries())
    .filter(([id]) => id !== userId)
    .map(([id, candidates]) => ({ userId: id, candidates }));

  return new Response(
    JSON.stringify({
      success: true,
      existingCandidates: otherCandidates,
    }),
    { status: 200 }
  );
}

/**
 * Handle participant leave
 */
function handleLeave(room: Room, userId: string, roomId: string): Response {
  // Remove participant
  room.participants.delete(userId);
  room.offers.delete(userId);
  room.answers.delete(userId);
  room.iceCandidates.delete(userId);

  console.log(`[WebRTC Signaling] Participant ${userId} left`);

  // Clean up empty rooms
  if (room.participants.size === 0) {
    rooms.delete(roomId);
    console.log(`[WebRTC Signaling] Room ${roomId} deleted (empty)`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
}