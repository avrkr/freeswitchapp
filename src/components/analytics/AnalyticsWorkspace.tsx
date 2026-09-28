"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, Phone, Voicemail } from "lucide-react";
import { CdrPanel } from "@/components/CdrPanel";

type Summary = {
  totalCalls: number;
  completedCalls: number;
  activeCalls: number;
  withRecording: number;
  avgBillSec: number;
  totalBillSec: number;
  callsLast24h: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Phone;
}) {
  return (
    <div className="rc-card flex items-center gap-4 p-4">
      <div className="rounded-xl bg-blue-50 p-3 text-[var(--rc-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--rc-text)]">{value}</p>
        <p className="text-xs text-[var(--rc-muted)]">{label}</p>
      </div>
    </div>
  );
}

export function AnalyticsWorkspace() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      void fetch("/api/analytics/summary")
        .then((r) => r.json())
        .then(
          (d: { configured?: boolean; message?: string; summary?: Summary | null }) => {
            setConfigured(d.configured !== false);
            setMessage(d.message ?? null);
            setSummary(d.summary ?? null);
          },
        )
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--rc-text)]">Analytics</h1>
        <p className="text-sm text-[var(--rc-muted)]">Metrics and CDR from MongoDB</p>
      </div>

      {!configured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message ?? "Set MONGODB_URI in .env.local"}
        </p>
      ) : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total calls" value={summary.totalCalls} icon={Phone} />
          <StatCard label="Completed" value={summary.completedCalls} icon={BarChart3} />
          <StatCard label="With recording" value={summary.withRecording} icon={Voicemail} />
          <StatCard label="Avg talk (sec)" value={summary.avgBillSec} icon={Clock} />
          <StatCard label="Active now" value={summary.activeCalls} icon={Phone} />
          <StatCard label="Last 24 hours" value={summary.callsLast24h} icon={BarChart3} />
          <StatCard label="Total talk (sec)" value={summary.totalBillSec} icon={Clock} />
        </div>
      ) : null}

      <CdrPanel />
    </div>
  );
}
