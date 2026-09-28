"use client";

import { RecordingsPanel } from "@/components/RecordingsPanel";

export function RecordingsWorkspace() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--rc-text)]">Recordings</h1>
        <p className="text-sm text-[var(--rc-muted)]">Playback and download call audio</p>
      </div>
      <RecordingsPanel />
    </div>
  );
}
