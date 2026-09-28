"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallRole } from "@/lib/types";

export type TranscriptLine = {
  id: string;
  callId: string;
  role: CallRole;
  text: string;
  isFinal: boolean;
  at: string;
};

export function useLiveTranscripts() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);

  const applyLine = useCallback((payload: Omit<TranscriptLine, "id">) => {
    setLines((prev) => {
      const id = `${payload.callId}:${payload.role}:${payload.isFinal ? "f" : "i"}:${payload.text.slice(0, 32)}`;
      const withoutDup = prev.filter((l) => l.id !== id);
      if (!payload.isFinal) {
        const interimKey = `${payload.callId}:${payload.role}:interim`;
        const filtered = withoutDup.filter((l) => !l.id.startsWith(interimKey));
        return [
          ...filtered,
          { ...payload, id: `${interimKey}:${payload.text}` },
        ].slice(-200);
      }
      return [...withoutDup, { ...payload, id }].slice(-200);
    });
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/transcripts/stream");
    source.onmessage = (ev) => {
      try {
        applyLine(JSON.parse(ev.data) as Omit<TranscriptLine, "id">);
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [applyLine]);

  const agentLines = lines.filter((l) => l.role === "agent");
  const customerLines = lines.filter((l) => l.role === "customer");

  return { lines, agentLines, customerLines };
}
