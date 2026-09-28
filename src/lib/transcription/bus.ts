import { EventEmitter } from "events";
import type { CallRole } from "@/lib/types";

export type LiveTranscriptEvent = {
  callId: string;
  role: CallRole;
  text: string;
  isFinal: boolean;
  at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __transcriptBus: EventEmitter | undefined;
}

export function getTranscriptBus() {
  if (!global.__transcriptBus) {
    global.__transcriptBus = new EventEmitter();
    global.__transcriptBus.setMaxListeners(100);
  }
  return global.__transcriptBus;
}

export function emitLiveTranscript(payload: LiveTranscriptEvent) {
  getTranscriptBus().emit("transcript", payload);
}
