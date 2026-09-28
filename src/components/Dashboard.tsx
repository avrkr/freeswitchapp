"use client";

import { useState } from "react";
import { useFsEvents } from "@/hooks/useFsEvents";
import { CdrPanel } from "@/components/CdrPanel";
import { Click2CallPanel } from "@/components/Click2CallPanel";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { LiveCallsPanel } from "@/components/LiveCallsPanel";
import { RecordingsPanel } from "@/components/RecordingsPanel";

type Tab = "live" | "recordings" | "cdr" | "click2call";

const tabs: { id: Tab; label: string }[] = [
  { id: "live", label: "Live calls" },
  { id: "recordings", label: "Recordings" },
  { id: "cdr", label: "CDR" },
  { id: "click2call", label: "Click2Call" },
];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("live");
  const { connected, channels, lastEvent, error } = useFsEvents();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
            FreeSWITCH Control
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Telephony dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Live ESL monitoring, call control, recordings, CDR, and click2call for your local
            FreeSWITCH instance.
          </p>
        </div>
        <ConnectionBadge connected={connected} lastEvent={lastEvent} error={error} />
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-zinc-900"
                : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "live" ? <LiveCallsPanel channels={channels} connected={connected} /> : null}
        {tab === "recordings" ? <RecordingsPanel /> : null}
        {tab === "cdr" ? <CdrPanel /> : null}
        {tab === "click2call" ? <Click2CallPanel /> : null}
      </main>
    </div>
  );
}
