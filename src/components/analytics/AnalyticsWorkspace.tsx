"use client";

import { CdrPanel } from "@/components/CdrPanel";

export function AnalyticsWorkspace() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--rc-text)]">Analytics</h1>
        <p className="text-sm text-[var(--rc-muted)]">CDR and call metrics from FreeSWITCH</p>
      </div>
      <CdrPanel />
    </div>
  );
}
