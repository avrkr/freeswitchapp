"use client";

import { CallHistoryPanel } from "@/components/CallHistoryPanel";

export function HistoryWorkspace() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--rc-text)]">Call history</h1>
        <p className="text-sm text-[var(--rc-muted)]">MongoDB — transcripts, recordings, metadata</p>
      </div>
      <CallHistoryPanel />
    </div>
  );
}
