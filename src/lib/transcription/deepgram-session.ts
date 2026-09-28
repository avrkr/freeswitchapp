import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { fsConfig } from "@/lib/config";
import type { CallRole } from "@/lib/types";
import { insertTranscriptSegment } from "@/lib/mongodb/calls";
import { emitLiveTranscript } from "@/lib/transcription/bus";

function toSocketData(buf: Buffer) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export type DeepgramLiveHandle = {
  sendAudio: (buf: Buffer) => void;
  close: () => void;
};

export function createDeepgramLiveSession(
  callId: string,
  role: CallRole,
): DeepgramLiveHandle | null {
  if (!fsConfig.deepgramApiKey) {
    return null;
  }

  const deepgram = createClient(fsConfig.deepgramApiKey);
  const connection = deepgram.listen.live({
    model: "nova-2",
    language: "en",
    smart_format: true,
    encoding: "linear16",
    sample_rate: 8000,
    channels: 1,
    interim_results: true,
    punctuate: true,
  });

  let open = false;
  const queue: Buffer[] = [];

  connection.on(LiveTranscriptionEvents.Open, () => {
    open = true;
    for (const buf of queue) connection.send(toSocketData(buf));
    queue.length = 0;
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: { channel?: { alternatives?: { transcript?: string; confidence?: number }[] }; is_final?: boolean }) => {
    const alt = data.channel?.alternatives?.[0];
    const text = alt?.transcript?.trim();
    if (!text) return;

    const isFinal = Boolean(data.is_final);
    emitLiveTranscript({
      callId,
      role,
      text,
      isFinal,
      at: new Date().toISOString(),
    });

    if (isFinal) {
      void insertTranscriptSegment({
        callId,
        role,
        text,
        isFinal: true,
        confidence: alt?.confidence,
      });
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    console.error("[deepgram]", callId, role, err);
  });

  return {
    sendAudio(buf: Buffer) {
      const chunk = toSocketData(buf);
      if (open) connection.send(chunk);
      else queue.push(buf);
    },
    close() {
      connection.requestClose();
    },
  };
}
