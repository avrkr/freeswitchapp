"use client";

import { Delete, PhoneCall } from "lucide-react";
import { useState } from "react";
import type { Click2CallMode } from "@/lib/types";

type Props = {
  disabled?: boolean;
  onDial: (payload: {
    agent: string;
    destination: string;
    record: boolean;
    mode: Click2CallMode;
  }) => Promise<void>;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function Dialpad({ disabled, onDial }: Props) {
  const [agent, setAgent] = useState("100");
  const [destination, setDestination] = useState("");
  const [record, setRecord] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function append(d: string) {
    setDestination((v) => (v + d).slice(0, 16));
  }

  async function call() {
    if (!destination.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      await onDial({ agent, destination, record, mode: "agent-first" });
      setStatus("Call initiated");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Call failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rc-card p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--rc-text)]">Dialpad</h2>
      <label className="mb-3 block text-xs font-medium text-[var(--rc-muted)]">
        Your extension (agent)
        <input
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--rc-border)] px-3 py-2 text-sm"
        />
      </label>
      <div className="mb-3 rounded-lg border border-[var(--rc-border)] bg-gray-50 px-3 py-3 text-right text-2xl font-semibold tracking-wider text-[var(--rc-text)]">
        {destination || "Enter number"}
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => append(k)}
            className="rounded-lg border border-[var(--rc-border)] bg-white py-3 text-lg font-medium hover:bg-gray-50"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[var(--rc-muted)]">
          <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} />
          Record & transcribe
        </label>
        <button
          type="button"
          onClick={() => setDestination((d) => d.slice(0, -1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
      <button
        type="button"
        disabled={disabled || loading || !destination}
        onClick={() => void call()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--rc-primary)] py-3.5 text-sm font-semibold text-white hover:bg-[var(--rc-primary-hover)] disabled:opacity-50"
      >
        <PhoneCall className="h-5 w-5" />
        {loading ? "Calling…" : "Call"}
      </button>
      {status ? <p className="mt-3 text-center text-xs text-[var(--rc-muted)]">{status}</p> : null}
    </div>
  );
}
