"use client";

import { useFsEvents } from "@/hooks/useFsEvents";
import { Dialpad } from "@/components/phone/Dialpad";
import { ActiveCallControls } from "@/components/phone/ActiveCallControls";
import { LiveTranscriptChat } from "@/components/phone/LiveTranscriptChat";
import { DeepgramTestPanel } from "@/components/phone/DeepgramTestPanel";
import { AlertTriangle, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Click2CallMode } from "@/lib/types";

type Props = { eslConnected: boolean; deepgramConfigured?: boolean };

export function PhoneWorkspace({ eslConnected, deepgramConfigured = false }: Props) {
  const { connected, channels } = useFsEvents();
  const [focusCallId, setFocusCallId] = useState<string | null>(null);
  const [micWsPort, setMicWsPort] = useState(3001);

  useEffect(() => {
    void fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((d: { micTestWs?: { port?: number } }) => {
        if (d.micTestWs?.port) setMicWsPort(d.micTestWs.port);
      })
      .catch(() => undefined);
  }, []);

  const onDial = useCallback(
    async (payload: {
      agent: string;
      destination: string;
      record: boolean;
      mode: Click2CallMode;
    }) => {
      const res = await fetch("/api/click2call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; callId?: string };
      if (!res.ok) throw new Error(data.error ?? "Call failed");
      if (data.callId) setFocusCallId(data.callId);
    },
    [],
  );

  const pbxOk = connected || eslConnected;

  return (
    <div className="space-y-4">
      {!pbxOk ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">PBX not connected</p>
            <p className="text-amber-800/90">
              Fix ESL ACL on FreeSWITCH, set <code className="text-xs">MONGODB_URI</code>,{" "}
              <code className="text-xs">DEEPGRAM_API_KEY</code>, and{" "}
              <code className="text-xs">AUDIO_FORK_PUBLIC_WS</code> (LAN IP, port 3001).
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rc-card flex items-center gap-4 p-4 md:col-span-1">
          <div className="rounded-xl bg-blue-50 p-3 text-[var(--rc-primary)]">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{channels.length}</p>
            <p className="text-xs text-[var(--rc-muted)]">Active channels</p>
          </div>
        </div>
        <div className="rc-card p-4 md:col-span-2">
          <p className="text-sm font-medium text-[var(--rc-text)]">In-call experience</p>
          <p className="text-xs text-[var(--rc-muted)]">
            Click a call card to link the transcript · stereo record on bridge · Deepgram on both legs
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Dialpad disabled={!pbxOk} onDial={onDial} />
        </div>
        <div className="space-y-4 xl:col-span-5">
          <ActiveCallControls
            channels={channels}
            connected={pbxOk}
            focusCallId={focusCallId}
            onFocusCallId={setFocusCallId}
          />
        </div>
        <div className="xl:col-span-4">
          <LiveTranscriptChat callId={focusCallId} />
        </div>
      </div>

      <DeepgramTestPanel deepgramConfigured={deepgramConfigured} micWsPort={micWsPort} />
    </div>
  );
}
