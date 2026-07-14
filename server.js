/**
 * Military Pass — Custom Production Server (Docker / Hugging Face Spaces)
 * ========================================================================
 * Wraps the Next.js request handler with a native WebSocket server so the
 * platform gets TRUE real-time streaming when self-hosted (HF Spaces Docker).
 *
 *   ┌───────────────────────────── Port 7860 ─────────────────────────────┐
 *   │  HTTP  → Next.js request handler (all pages + API routes)           │
 *   │  WS    → ws WebSocketServer on path /api/ws                         │
 *   │           protocol: { type, payload, timestamp, id }  (JSON)        │
 *   │           events:  frame_request → frame_result                     │
 *   │                    voice_request → voice_result                     │
 *   │                    heartbeat     → heartbeat_ack                    │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * AI inference chain (mirrors lib/aiBackend.ts):
 *   1. Hugging Face ZeroGPU Space (Gradio API)  — sole engine
 *   2. Dev echo                                 — last resort
 *
 * ✅ Connection management   ✅ Room-based broadcasting
 * ✅ Message routing         ✅ Performance monitoring
 * ✅ Heartbeats              ✅ Graceful shutdown
 */

const { createServer } = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "7860", 10);

// Signal to /api/ws GET that native WebSocket transport is live
process.env.WEBSOCKET_ENABLED = "true";

// ── AI backend configuration ─────────────────────────────────────

const HF_AI_SPACE_URL =
  process.env.HF_AI_SPACE_URL ||
  process.env.NEXT_PUBLIC_HF_AI_SPACE_URL ||
  "https://fashionistar-military-pass-ai.hf.space";

const BACKEND_PRIORITY = ["hf"];

const AI_TIMEOUT_MS = 60_000;

// ── Gradio API helper (Gradio 5 two-step call protocol) ──────────

async function callGradioAPI(baseUrl, apiName, data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const submitRes = await fetch(`${baseUrl}/gradio_api/call/${apiName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal: controller.signal,
    });
    if (!submitRes.ok) throw new Error(`Gradio submit HTTP ${submitRes.status}`);

    const { event_id } = await submitRes.json();
    if (!event_id) throw new Error("Gradio submit returned no event_id");

    const resultRes = await fetch(
      `${baseUrl}/gradio_api/call/${apiName}/${event_id}`,
      { signal: controller.signal },
    );
    if (!resultRes.ok) throw new Error(`Gradio result HTTP ${resultRes.status}`);

    const sseText = await resultRes.text();
    let lastData = null;
    for (const line of sseText.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        try {
          lastData = JSON.parse(trimmed.slice(5).trim());
        } catch {
          /* keep-alive line */
        }
      }
    }
    if (lastData === null) throw new Error("Gradio stream had no data");

    const first = Array.isArray(lastData) ? lastData[0] : lastData;
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

// ── Face swap chain ──────────────────────────────────────────────

async function faceSwapViaHF(p) {
  const t0 = Date.now();
  const out = await callGradioAPI(HF_AI_SPACE_URL, "face_swap", [
    p.frame_b64,
    JSON.stringify(p.avatar_embedding || []),
    p.enhance !== false,
    p.align_skin !== false,
    p.quality || "balanced",
  ]);
  const resultB64 = (out && (out.result_b64 || out.frame_b64)) || "";
  if (!resultB64) throw new Error("HF face_swap: empty result");
  return {
    result_b64: resultB64,
    latency_ms: Date.now() - t0,
    faces_detected: out.faces_detected,
    quality: p.quality || "balanced",
    backend: "huggingface",
  };
}

async function swapFace(p) {
  const providers = { hf: faceSwapViaHF };
  const errors = [];
  for (const name of BACKEND_PRIORITY) {
    const fn = providers[name];
    if (!fn) continue;
    try {
      return await fn(p);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  console.warn("[server] face swap chain exhausted:", errors.join(" | "));
  return {
    result_b64: p.frame_b64,
    latency_ms: 0,
    quality: p.quality || "balanced",
    backend: "dev-echo",
    dev_mode: true,
  };
}

// ── Voice chain ──────────────────────────────────────────────────

async function voiceViaHF(p) {
  const t0 = Date.now();
  const out = await callGradioAPI(HF_AI_SPACE_URL, "voice_transform", [
    p.audio_b64,
    p.preset || "operative",
    p.pitch_override || 0,
    p.speed_override || 0,
  ]);
  const audioB64 = (out && out.audio_b64) || "";
  if (!audioB64) throw new Error("HF voice_transform: empty result");
  return {
    audio_b64: audioB64,
    latency_ms: Date.now() - t0,
    preset: p.preset || "operative",
    backend: "huggingface",
  };
}

async function transformVoice(p) {
  const providers = { hf: voiceViaHF };
  const errors = [];
  for (const name of BACKEND_PRIORITY) {
    const fn = providers[name];
    if (!fn) continue;
    try {
      return await fn(p);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  console.warn("[server] voice chain exhausted:", errors.join(" | "));
  return {
    audio_b64: p.audio_b64,
    latency_ms: 0,
    preset: p.preset || "operative",
    backend: "dev-echo",
    dev_mode: true,
  };
}

// ── WebSocket server ─────────────────────────────────────────────

const metrics = {
  connections: 0,
  totalConnections: 0,
  messages: 0,
  errors: 0,
  startTime: Date.now(),
};

/** room name → Set<WebSocket> */
const rooms = new Map();

function joinRoom(ws, room) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
  ws._room = room;
}

function leaveRoom(ws) {
  const room = ws._room;
  if (room && rooms.has(room)) {
    rooms.get(room).delete(ws);
    if (rooms.get(room).size === 0) rooms.delete(room);
  }
  ws._room = null;
}

function wsSend(ws, type, payload, id) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload, timestamp: Date.now(), id }));
  }
}

function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });

  // Only intercept upgrades for /api/ws — leave HMR & other paths alone
  httpServer.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    } catch {
      socket.destroy();
      return;
    }

    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
    // Next.js dev HMR or other upgrades are ignored in production
  });

  wss.on("connection", (ws, req) => {
    metrics.connections++;
    metrics.totalConnections++;

    let userId = "anonymous";
    let room = "default";
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      userId = url.searchParams.get("userId") || "anonymous";
      room = url.searchParams.get("room") || "default";
    } catch {
      /* defaults hold */
    }

    ws._userId = userId;
    joinRoom(ws, room);
    ws.isAlive = true;

    console.log(
      `[WS] connected: user=${userId} room=${room} (active: ${metrics.connections})`,
    );

    wsSend(ws, "status", { status: "connected", timestamp: Date.now() });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (raw) => {
      metrics.messages++;
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        wsSend(ws, "error", { message: "Invalid JSON", code: "BAD_MESSAGE" });
        return;
      }

      const { type, payload = {}, id } = msg;

      try {
        switch (type) {
          case "frame_request": {
            const result = await swapFace(payload);
            wsSend(ws, "frame_result", result, id);
            break;
          }

          case "voice_request": {
            const result = await transformVoice(payload);
            wsSend(ws, "voice_result", result, id);
            break;
          }

          case "heartbeat": {
            wsSend(ws, "heartbeat_ack", {
              timestamp: Date.now(),
              serverLatency: payload.timestamp ? Date.now() - payload.timestamp : null,
            });
            break;
          }

          case "join_room": {
            leaveRoom(ws);
            joinRoom(ws, payload.room || "default");
            wsSend(ws, "status", { status: "room_joined", room: ws._room });
            break;
          }

          case "leave_room": {
            leaveRoom(ws);
            joinRoom(ws, "default");
            break;
          }

          default:
            wsSend(ws, "error", {
              message: `Unknown message type: ${type}`,
              code: "UNKNOWN_TYPE",
            });
        }
      } catch (err) {
        metrics.errors++;
        console.error("[WS] handler error:", err);
        wsSend(ws, "error", { message: "Processing failed", code: "PROCESSING_ERROR" }, id);
      }
    });

    ws.on("close", () => {
      metrics.connections--;
      leaveRoom(ws);
      console.log(`[WS] disconnected: user=${userId} (active: ${metrics.connections})`);
    });

    ws.on("error", (err) => {
      metrics.errors++;
      console.error("[WS] socket error:", err.message);
    });
  });

  // Heartbeat sweep — terminate dead connections every 30s
  const sweep = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(sweep));

  return wss;
}

// ── Boot ─────────────────────────────────────────────────────────

let handle;

if (dev) {
  // Dev mode: use next() factory which loads next.config.js normally
  const next = require("next");
  const app = next({ dev, hostname, port });
  handle = app.getRequestHandler();
  app.prepare().then(boot);
} else {
  // Production standalone: use NextServer directly with pre-built config
  // Avoids loading next.config.js at runtime (requires webpack not in standalone)
  const NextServer = require("next/dist/server/next-server").default;
  const configPath = path.join(__dirname, ".next", "required-server-files.json");
  const serverFiles = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const app = new NextServer({
    hostname,
    port,
    dir: __dirname,
    dev: false,
    customServer: true,
    conf: serverFiles.config,
  });
  handle = app.getRequestHandler();
  boot();
}

function boot() {
  const httpServer = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // ── Proxy PostHog /ingest/ requests to us.posthog.com ──────────
    if (url.pathname.startsWith("/ingest/")) {
      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        });
        res.end();
        return;
      }

      const proxyUrl = `https://us.posthog.com${url.pathname}${url.search}`;
      const proxyHeaders = { ...req.headers, host: "us.posthog.com" };
      delete proxyHeaders["origin"];
      delete proxyHeaders["referer"];

      const proxyReq = https.request(proxyUrl, {
        method: req.method,
        headers: proxyHeaders,
      }, (proxyRes) => {
        const headers = { ...proxyRes.headers };
        headers["Access-Control-Allow-Origin"] = "*";
        res.writeHead(proxyRes.statusCode || 200, headers);
        proxyRes.pipe(res);
      });
      proxyReq.on("error", () => {
        res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ error: "Analytics proxy failed" }));
      });
      req.pipe(proxyReq);
      return;
    }

    // Serve static files from /.next/static/ explicitly (fixes Turbopack chunk 404s)
    if (url.pathname.startsWith("/_next/static/")) {
      const filePath = path.join(__dirname, ".next", "static", url.pathname.replace("/_next/static/", ""));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mime = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff": "font/woff", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
        res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    // Serve files from /public/ explicitly
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_next/")) {
      const pubPath = path.join(__dirname, "public", url.pathname);
      if (fs.existsSync(pubPath) && fs.statSync(pubPath).isFile()) {
        const ext = path.extname(pubPath);
        const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webp": "image/webp", ".gif": "image/gif" };
        res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
        fs.createReadStream(pubPath).pipe(res);
        return;
      }
    }
    handle(req, res);
  });

  const wss = setupWebSocketServer(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log("═".repeat(64));
    console.log(`  Military Pass — production server`);
    console.log(`  HTTP      : http://${hostname}:${port}`);
    console.log(`  WebSocket : ws://${hostname}:${port}/api/ws`);
    console.log(`  AI chain  : ${BACKEND_PRIORITY.join(" → ")} → dev-echo`);
    console.log(`  HF Space  : ${HF_AI_SPACE_URL}`);
    console.log("═".repeat(64));
  });

  // Graceful shutdown (HF Spaces sends SIGTERM on rebuild/restart)
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received — shutting down gracefully`);
    wss.clients.forEach((ws) => ws.close(1001, "Server restarting"));
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
