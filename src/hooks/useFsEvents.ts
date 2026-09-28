"use client";

import { useCallback, useEffect, useState } from "react";
import type { FsEventPayload, LiveChannel } from "@/lib/types";

export function useFsEvents() {
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((payload: FsEventPayload) => {
    if (payload.connected !== undefined) setConnected(payload.connected);
    if (payload.channels) setChannels(payload.channels);
    if (payload.type === "event" && payload.event?.["Event-Name"]) {
      setLastEvent(payload.event["Event-Name"]);
    }
    if (payload.type === "error" && payload.message) {
      setError(payload.message);
    }
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (ev) => {
      try {
        applyPayload(JSON.parse(ev.data) as FsEventPayload);
      } catch {
        /* ignore malformed */
      }
    };
    source.onerror = () => {
      setConnected(false);
      setError("Live event stream disconnected");
    };
    return () => source.close();
  }, [applyPayload]);

  return { connected, channels, lastEvent, error };
}
