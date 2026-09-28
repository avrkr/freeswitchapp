import type { WebSocket } from "ws";
import { createDeepgramMicSession } from "@/lib/transcription/deepgram-session";

type StartMsg = { type: "start"; sampleRate?: number };

export function handleDeepgramMicConnection(ws: WebSocket) {
  let dg: ReturnType<typeof createDeepgramMicSession> = null;
  let started = false;

  const send = (payload: object) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(String(data)) as StartMsg;
        if (msg.type === "start" && !started) {
          const sampleRate = msg.sampleRate && msg.sampleRate > 0 ? msg.sampleRate : 16000;
          dg = createDeepgramMicSession(sampleRate, ({ text, isFinal }) => {
            send({ type: "transcript", text, isFinal });
          });
          if (!dg) {
            send({ type: "error", message: "DEEPGRAM_API_KEY not configured" });
            ws.close(1011, "Deepgram not configured");
            return;
          }
          started = true;
          send({ type: "ready", sampleRate });
        }
      } catch {
        send({ type: "error", message: "Send JSON { type: 'start', sampleRate } first" });
      }
      return;
    }

    if (!dg) return;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    dg.sendAudio(buf);
  });

  ws.on("close", () => {
    dg?.close();
  });
}
