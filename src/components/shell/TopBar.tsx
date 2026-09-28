"use client";

import { Bell, Search, UserCircle2 } from "lucide-react";

type Props = {
  integrations: { esl: boolean; mongodb: boolean; deepgram: boolean };
};

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

export function TopBar({ integrations }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--rc-border)] bg-white px-4 md:px-6">
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search calls, numbers, transcripts…"
          className="w-full rounded-lg border border-[var(--rc-border)] bg-gray-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-[var(--rc-primary)] focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
        <div className="hidden flex-wrap gap-2 lg:flex">
          <Pill ok={integrations.esl} label="PBX" />
          <Pill ok={integrations.deepgram} label="Transcription" />
          <Pill ok={integrations.mongodb} label="Database" />
        </div>
        <button type="button" className="rounded-lg p-2 text-gray-500 hover:bg-gray-50">
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[var(--rc-border)] px-2 py-1.5 text-sm text-[var(--rc-text)]"
        >
          <UserCircle2 className="h-6 w-6 text-[var(--rc-primary)]" />
          <span className="hidden sm:inline">Agent</span>
        </button>
      </div>
    </header>
  );
}
