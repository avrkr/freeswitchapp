"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CallRole } from "@/lib/types";

export type TranscriptLine = {
  id: string;
  callId: string;
  role: CallRole;
  text: string;
  isFinal: boolean;
  at: string;
  source?: string;
};

export function useLiveTranscripts(callId?: string | null) {
  const [lines, setLines] = useState<TranscriptLine[]>([]);

  const applyLine = useCallback((payload: Omit<TranscriptLine, "id">) => {
    if (callId && payload.callId !== callId) return;

    setLines((prev) => {
      const id = `${payload.callId}:${payload.role}:${payload.isFinal ? "f" : "i"}:${payload.text.slice(0, 48)}`;
      const withoutDup = prev.filter((l) => l.id !== id);
      if (!payload.isFinal) {
        const interimKey = `${payload.callId}:${payload.role}:interim`;
        const filtered = withoutDup.filter((l) => !l.id.startsWith(interimKey));
        return [
          ...filtered,
          { ...payload, id: `${interimKey}:${payload.text}` },
        ].slice(-300);
      }
      return [...withoutDup, { ...payload, id }].slice(-300);
    });
  }, [callId]);

  useEffect(() => {
    setLines([]);
  }, [callId]);

  useEffect(() => {
    const source = new EventSource("/api/transcripts/stream");
    source.onmessage = (ev) => {
      if (ev.data.startsWith(":")) return;
      try {
        applyLine(JSON.parse(ev.data) as Omit<TranscriptLine, "id">);
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [applyLine]);

  useEffect(() => {
    const poll = () => {
      const q = callId
        ? `/api/transcripts/recent?callId=${encodeURIComponent(callId)}&limit=200`
        : "/api/transcripts/recent?limit=100";
      void fetch(q)
        .then((r) => r.json())
        .then(
          (d: {
            segments?: Array<{
              callId: string;
              role: CallRole;
              text: string;
              isFinal: boolean;
              createdAt: string;
              source?: string;
            }>;
          }) => {
            for (const seg of d.segments ?? []) {
              applyLine({
                callId: seg.callId,
                role: seg.role,
                text: seg.text,
                isFinal: seg.isFinal,
                at: new Date(seg.createdAt).toISOString(),
                source: seg.source,
              });
            }
          },
        )
        .catch(() => undefined);
    };
    poll();
    const ms = callId ? 2000 : 5000;
    const t = setInterval(poll, ms);
    return () => clearInterval(t);
  }, [applyLine, callId]);

  const sorted = useMemo(
    () => [...lines].sort((a, b) => a.at.localeCompare(b.at)),
    [lines],
  );

  const agentLines = sorted.filter((l) => l.role === "agent");
  const customerLines = sorted.filter((l) => l.role === "customer");

  return { lines: sorted, agentLines, customerLines };
}
