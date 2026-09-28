"use client";

import { useState } from "react";
import type { Click2CallMode } from "@/lib/types";

export function Click2CallPanel() {
  const [agent, setAgent] = useState("100");
  const [destination, setDestination] = useState("200");
  const [mode, setMode] = useState<Click2CallMode>("agent-first");
  const [record, setRecord] = useState(true);
  const [callerIdName, setCallerIdName] = useState("Click2Call");
  const [callerIdNumber, setCallerIdNumber] = useState("100");
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/click2call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          destination,
          mode,
          record,
          callerIdName,
          callerIdNumber,
          timeoutSeconds,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; result?: string; error?: string; command?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Click2call failed");
        return;
      }
      setStatus(data.result ?? "Originate queued");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Click2Call</h2>
        <p className="text-sm text-zinc-400">
          Originate via ESL — agent-first rings the agent then bridges to destination
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Agent extension</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Destination</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Dial mode</span>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={mode}
            onChange={(e) => setMode(e.target.value as Click2CallMode)}
          >
            <option value="agent-first">Agent first (progressive)</option>
            <option value="destination-first">Destination first</option>
            <option value="simultaneous">Simultaneous ring</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Ring timeout (seconds)</span>
          <input
            type="number"
            min={5}
            max={120}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Caller ID name</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={callerIdName}
            onChange={(e) => setCallerIdName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Caller ID number</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            value={callerIdNumber}
            onChange={(e) => setCallerIdNumber(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
          <input
            type="checkbox"
            checked={record}
            onChange={(e) => setRecord(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Record call to recordings folder (stereo WAV)
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Dialing…" : "Start click2call"}
          </button>
        </div>
      </form>

      {status ? (
        <p className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-300 ring-1 ring-zinc-800">
          {status}
        </p>
      ) : null}
    </section>
  );
}
