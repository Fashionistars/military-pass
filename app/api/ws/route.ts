/**
 * Military Pass - WebSocket Server for Real-Time Communication
 * ============================================================
 * Enterprise-grade WebSocket server implementation:
 * 
 * ✅ Connection management
 * ✅ Room-based broadcasting
 * ✅ Message routing
 * ✅ Performance monitoring
 * ✅ Error handling
 * ✅ TypeScript with full type safety
 */

import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Socket } from 'socket.io';

// Types
interface ServerToClientEvents {
  frame_result: (data: { result_b64: string; latency_ms: number; quality: string }) => void;
  voice_result: (data: { audio_b64: string; latency_ms: number; preset: string }) => void;
  error: (data: { message: string; code: string }) => void;
  status: (data: { status: string; timestamp: number }) => void;
}

interface ClientToServerEvents {
  frame_request: (data: { frame_b64: string; avatar_embedding: number[]; quality: string }) => void;
  voice_request: (data: { audio_b64: string; preset: string }) => void;
  heartbeat: (data: { timestamp: number }) => void;
  join_room: (data: { room: string }) => void;
  leave_room: (data: { room: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
  room: string;
  connectedAt: number;
}

// Global Socket.IO server instance
let io: SocketIOServer<ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData> | null = null;
let httpServer: HTTPServer | null = null;

// Performance monitoring
const performanceMetrics = {
  connections: 0,
  messages: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(): SocketIOServer {
  if (io) {
    return io;
  }

  if (!httpServer) {
    httpServer = require('http').createServer();
  }

  io = new SocketIOServer<ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      path: '/api/ws',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    }
  );

  setupSocketHandlers();

  return io;
}

/**
 * Setup Socket.IO event handlers
 */
function setupSocketHandlers(): void {
  if (!io) return;

  io.on('connection', (socket: Socket<ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData>) => {
    const userId = socket.handshake.query.userId as string;
    const room = socket.handshake.query.room as string || 'default';

    // Store socket data
    socket.data = {
      userId: userId || 'anonymous',
      room,
      connectedAt: Date.now(),
    };

    // Update metrics
    performanceMetrics.connections++;

    console.log(`[WebSocket] Client connected: ${socket.id} (userId: ${socket.data.userId}, room: ${socket.data.room})`);

    // Join room
    socket.join(room);

    // Send welcome message
    socket.emit('status', {
      status: 'connected',
      timestamp: Date.now(),
    });

    // Handle frame request
    socket.on('frame_request', async (data) => {
      try {
        performanceMetrics.messages++;

        // Process frame request
        const result = await processFrameRequest(data);

        // Send result back to client
        socket.emit('frame_result', result);

        // Broadcast to room if requested
        socket.to(room).emit('frame_result', result);

      } catch (error) {
        performanceMetrics.errors++;
        console.error('[WebSocket] Frame request error:', error);
        socket.emit('error', {
          message: 'Frame processing failed',
          code: 'PROCESSING_ERROR',
        });
      }
    });

    // Handle voice request
    socket.on('voice_request', async (data) => {
      try {
        performanceMetrics.messages++;

        // Process voice request
        const result = await processVoiceRequest(data);

        // Send result back to client
        socket.emit('voice_result', result);

      } catch (error) {
        performanceMetrics.errors++;
        console.error('[WebSocket] Voice request error:', error);
        socket.emit('error', {
          message: 'Voice processing failed',
          code: 'PROCESSING_ERROR',
        });
      }
    });

    // Handle heartbeat
    socket.on('heartbeat', (data) => {
      // Echo heartbeat back
      socket.emit('heartbeat', {
        timestamp: Date.now(),
        serverLatency: Date.now() - data.timestamp,
      });
    });

    // Handle room join
    socket.on('join_room', (data) => {
      socket.leave(socket.data.room);
      socket.join(data.room);
      socket.data.room = data.room;
      console.log(`[WebSocket] Client ${socket.id} joined room: ${data.room}`);
    });

    // Handle room leave
    socket.on('leave_room', (data) => {
      socket.leave(data.room);
      console.log(`[WebSocket] Client ${socket.id} left room: ${data.room}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (reason: ${reason})`);
      performanceMetrics.connections--;
    });

    // Handle error
    socket.on('error', (error) => {
      console.error('[WebSocket] Socket error:', error);
      performanceMetrics.errors++;
    });
  });
}

/**
 * Process frame request
 */
async function processFrameRequest(data: {
  frame_b64: string;
  avatar_embedding: number[];
  quality: string;
}): Promise<{ result_b64: string; latency_ms: number; quality: string }> {
  const startTime = Date.now();

  // Call face swap API
  const response = await fetch(`${process.env.MODAL_FACE_SWAP_URL}/api/ai/face-swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      frame_b64: data.frame_b64,
      avatar_embedding: data.avatar_embedding,
      quality: data.quality,
      enhance: true,
      align_skin: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Face swap API error: ${response.status}`);
  }

  const result = await response.json();
  const latency = Date.now() - startTime;

  return {
    result_b64: result.result_b64,
    latency_ms: latency,
    quality: data.quality,
  };
}

/**
 * Process voice request
 */
async function processVoiceRequest(data: {
  audio_b64: string;
  preset: string;
}): Promise<{ audio_b64: string; latency_ms: number; preset: string }> {
  const startTime = Date.now();

  // Call voice transform API
  const response = await fetch(`${process.env.MODAL_VOICE_URL}/api/ai/voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      audio_b64: data.audio_b64,
      preset: data.preset,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voice transform API error: ${response.status}`);
  }

  const result = await response.json();
  const latency = Date.now() - startTime;

  return {
    audio_b64: result.audio_b64,
    latency_ms: latency,
    preset: data.preset,
  };
}

/**
 * GET /api/ws - WebSocket upgrade endpoint
 */
export async function GET(req: NextRequest) {
  // Initialize Socket.IO server
  const server = initializeSocketIO();

  // Get performance metrics
  const uptime = Date.now() - performanceMetrics.startTime;
  const metrics = {
    ...performanceMetrics,
    uptime,
    messagesPerSecond: performanceMetrics.messages / (uptime / 1000),
    errorRate: performanceMetrics.errors / (performanceMetrics.messages || 1),
  };

  return new Response(
    JSON.stringify({
      status: 'operational',
      websocket: 'ready',
      metrics,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * POST /api/ws - Send message to all connected clients
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload, room } = body;

    if (!io) {
      return new Response(
        JSON.stringify({ error: 'WebSocket server not initialized' }),
        { status: 503 }
      );
    }

    // Broadcast message
    if (room) {
      io.to(room).emit(type, payload);
    } else {
      io.emit(type, payload);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400 }
    );
  }
}

/**
 * Get Socket.IO server instance
 */
export function getSocketIOServer(): SocketIOServer | null {
  return io;
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics() {
  const uptime = Date.now() - performanceMetrics.startTime;
  return {
    ...performanceMetrics,
    uptime,
    messagesPerSecond: performanceMetrics.messages / (uptime / 1000),
    errorRate: performanceMetrics.errors / (performanceMetrics.messages || 1),
  };
}