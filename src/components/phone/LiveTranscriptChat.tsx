"use client";

import { useLiveTranscripts } from "@/hooks/useLiveTranscripts";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  callId?: string | null;
};

export function LiveTranscriptChat({ callId }: Props) {
  const { lines } = useLiveTranscripts(callId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="rc-card flex h-full min-h-[420px] flex-col">
      <div className="border-b border-[var(--rc-border)] px-5 py-4">
        <h2 className="text-lg font-semibold">Live transcript</h2>
        <p className="text-xs text-[var(--rc-muted)]">
          {callId
            ? `Call ${callId.slice(0, 8)}… — agent & customer`
            : "Select an active call to filter captions"}
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!callId ? (
          <p className="text-center text-sm text-[var(--rc-muted)]">
            Place or receive a call — the active call links here automatically.
          </p>
        ) : lines.length === 0 ? (
          <div className="space-y-2 text-center text-sm text-[var(--rc-muted)]">
            <p>Listening… speak on the call.</p>
            <p className="text-xs">
              Live captions need <code className="text-[10px]">DEEPGRAM_API_KEY</code>,{" "}
              <code className="text-[10px]">mod_audio_fork</code>, and{" "}
              <code className="text-[10px]">AUDIO_FORK_PUBLIC_WS</code> reachable from the PBX.
              After hangup, post-call transcript uses the recording.
            </p>
          </div>
        ) : (
          lines.map((line) => {
            const agent = line.role === "agent";
            return (
              <div
                key={line.id}
                className={`flex gap-2 ${agent ? "justify-start" : "justify-end"}`}
              >
                {agent ? (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[var(--rc-primary)]">
                    <User className="h-4 w-4" />
                  </div>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    agent
                      ? "rounded-tl-sm bg-blue-50 text-[var(--rc-text)]"
                      : "rounded-tr-sm bg-orange-50 text-[var(--rc-text)]"
                  } ${line.isFinal ? "" : "opacity-70 italic"}`}
                >
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--rc-muted)]">
                    {agent ? "Agent" : "Customer"}
                    {line.source === "post-call" ? " · recording" : line.source === "live" ? " · live" : ""}
                  </p>
                  {line.text}
                </div>
                {!agent ? (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[var(--rc-accent)]">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
