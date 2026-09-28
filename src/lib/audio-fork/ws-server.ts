import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { CallRole } from "@/lib/types";
import { createDeepgramLiveSession } from "@/lib/transcription/deepgram-session";
import { handleDeepgramMicConnection } from "@/lib/audio-fork/deepgram-mic-ws";

function parseForkUrl(url: string | undefined) {
  if (!url) return null;
  const u = new URL(url, "http://localhost");
  if (u.pathname !== "/fork") return null;
  const callId = u.searchParams.get("callId");
  const role = u.searchParams.get("role") as CallRole | null;
  if (!callId || (role !== "agent" && role !== "customer")) return null;
  return { callId, role };
}

function pathnameOf(url: string | undefined) {
  if (!url) return "/";
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return url.split("?")[0] ?? "/";
  }
}

function handleForkConnection(ws: WebSocket, req: IncomingMessage) {
  const meta = parseForkUrl(req.url);
  if (!meta) {
    ws.close(1008, "callId and role=agent|customer required");
    return;
  }

  console.log("[audio-fork] FS connected", meta.role, meta.callId.slice(0, 8));

  const dg = createDeepgramLiveSession(meta.callId, meta.role);
  if (!dg) {
    ws.close(1011, "Deepgram not configured");
    return;
  }

  let bytes = 0;
  ws.on("message", (data, isBinary) => {
    if (!isBinary) return;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    bytes += buf.length;
    dg.sendAudio(buf);
  });

  ws.on("close", () => {
    console.log("[audio-fork] closed", meta.role, "bytes", bytes);
    dg.close();
  });
}

export function startAudioForkServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const path = pathnameOf(req.url);
    if (path === "/deepgram-mic") {
      handleDeepgramMicConnection(ws);
      return;
    }
    if (path === "/fork") {
      handleForkConnection(ws, req);
      return;
    }
    ws.close(1008, "Unknown WebSocket path");
  });

  console.log(
    `[audio-fork] WebSocket on ws://0.0.0.0:${port} (/fork, /deepgram-mic)`,
  );
  return wss;
}
