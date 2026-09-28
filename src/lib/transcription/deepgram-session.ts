import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { fsConfig } from "@/lib/config";
import type { CallRole } from "@/lib/types";
import { insertTranscriptSegment } from "@/lib/mongodb/calls";
import { emitLiveTranscript } from "@/lib/transcription/bus";

function socketPayload(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export type DeepgramLiveHandle = {
  sendAudio: (buf: Buffer) => void;
  close: () => void;
};

function createLiveConnection(sampleRate: number) {
  const deepgram = createClient(fsConfig.deepgramApiKey);
  return deepgram.listen.live({
    model: "nova-2",
    language: "en",
    smart_format: true,
    encoding: "linear16",
    sample_rate: sampleRate,
    channels: 1,
    interim_results: true,
    punctuate: true,
  });
}

function liveAudioHandle(
  connection: ReturnType<ReturnType<typeof createClient>["listen"]["live"]>,
): DeepgramLiveHandle {
  let open = false;
  const queue: Buffer[] = [];

  connection.on(LiveTranscriptionEvents.Open, () => {
    open = true;
    for (const buf of queue) connection.send(socketPayload(buf));
    queue.length = 0;
  });

  return {
    sendAudio(buf: Buffer) {
      if (open) connection.send(socketPayload(buf));
      else queue.push(buf);
    },
    close() {
      connection.requestClose();
    },
  };
}

export function createDeepgramMicSession(
  sampleRate: number,
  onTranscript: (payload: { text: string; isFinal: boolean }) => void,
): DeepgramLiveHandle | null {
  if (!fsConfig.deepgramApiKey) return null;

  const connection = createLiveConnection(sampleRate);

  connection.on(
    LiveTranscriptionEvents.Transcript,
    (data: {
      channel?: { alternatives?: { transcript?: string }[] };
      is_final?: boolean;
    }) => {
      const text = data.channel?.alternatives?.[0]?.transcript?.trim();
      if (!text) return;
      onTranscript({ text, isFinal: Boolean(data.is_final) });
    },
  );

  connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    console.error("[deepgram-mic]", err);
  });

  return liveAudioHandle(connection);
}

export function createDeepgramLiveSession(
  callId: string,
  role: CallRole,
): DeepgramLiveHandle | null {
  if (!fsConfig.deepgramApiKey) {
    return null;
  }

  const connection = createLiveConnection(8000);

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
        source: "live",
      });
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    console.error("[deepgram]", callId, role, err);
  });

  return liveAudioHandle(connection);
}
