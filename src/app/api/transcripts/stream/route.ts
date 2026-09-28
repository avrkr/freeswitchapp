import { getTranscriptBus } from "@/lib/transcription/bus";
import type { LiveTranscriptEvent } from "@/lib/transcription/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const bus = getTranscriptBus();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: LiveTranscriptEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      bus.on("transcript", send);

      req.signal.addEventListener("abort", () => {
        closed = true;
        bus.off("transcript", send);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
