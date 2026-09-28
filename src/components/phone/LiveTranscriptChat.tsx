"use client";

import { useLiveTranscripts } from "@/hooks/useLiveTranscripts";
import { Bot, User } from "lucide-react";

export function LiveTranscriptChat() {
  const { lines } = useLiveTranscripts();

  return (
    <div className="rc-card flex h-full min-h-[420px] flex-col">
      <div className="border-b border-[var(--rc-border)] px-5 py-4">
        <h2 className="text-lg font-semibold">Live transcript</h2>
        <p className="text-xs text-[var(--rc-muted)]">Agent & customer · Deepgram streaming</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <p className="text-center text-sm text-[var(--rc-muted)]">
            Start a call to see real-time captions
          </p>
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
      </div>
    </div>
  );
}
