import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { CallRole } from "@/lib/types";
import { createDeepgramLiveSession } from "@/lib/transcription/deepgram-session";

function parseForkUrl(url: string | undefined) {
  if (!url) return null;
  const u = new URL(url, "http://localhost");
  const callId = u.searchParams.get("callId");
  const role = u.searchParams.get("role") as CallRole | null;
  if (!callId || (role !== "agent" && role !== "customer")) return null;
  return { callId, role };
}

export function startAudioForkServer(port: number) {
  const wss = new WebSocketServer({ port, path: "/fork" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const meta = parseForkUrl(req.url);
    if (!meta) {
      ws.close(1008, "callId and role=agent|customer required");
      return;
    }

    const dg = createDeepgramLiveSession(meta.callId, meta.role);
    if (!dg) {
      ws.close(1011, "Deepgram not configured");
      return;
    }

    ws.on("message", (data, isBinary) => {
      if (!isBinary) return;
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      dg.sendAudio(buf);
    });

    ws.on("close", () => {
      dg.close();
    });
  });

  console.log(`[audio-fork] WebSocket listening on ws://0.0.0.0:${port}/fork`);
  return wss;
}
