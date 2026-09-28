import type { FsEventPayload } from "@/lib/types";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const manager = getEslManager();
  await manager.start();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: FsEventPayload) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({
        type: "snapshot",
        channels: manager.snapshot,
        connected: manager.connected,
        at: new Date().toISOString(),
      });

      const onBroadcast = (payload: FsEventPayload) => send(payload);
      manager.on("broadcast", onBroadcast);

      req.signal.addEventListener("abort", () => {
        closed = true;
        manager.off("broadcast", onBroadcast);
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
