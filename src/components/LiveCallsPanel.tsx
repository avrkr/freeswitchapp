"use client";

import { useState } from "react";
import type { LiveChannel } from "@/lib/types";

type Props = {
  channels: LiveChannel[];
  connected: boolean;
};

export function LiveCallsPanel({ channels, connected }: Props) {
  const [busyUuid, setBusyUuid] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});

  async function runAction(uuid: string, action: string, target?: string) {
    setBusyUuid(uuid);
    try {
      if (action === "hangup") {
        await fetch(`/api/calls/${uuid}`, { method: "DELETE" });
      } else {
        await fetch(`/api/calls/${uuid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, target }),
        });
      }
    } finally {
      setBusyUuid(null);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Live calls</h2>
          <p className="text-sm text-zinc-400">
            Real-time channels from FreeSWITCH ESL ({channels.length} active)
          </p>
        </div>
        {!connected ? (
          <span className="text-xs text-amber-400">Reconnecting to ESL…</span>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-zinc-400">
            <tr className="border-b border-zinc-800">
              <th className="px-2 py-2 font-medium">Caller</th>
              <th className="px-2 py-2 font-medium">Destination</th>
              <th className="px-2 py-2 font-medium">State</th>
              <th className="px-2 py-2 font-medium">Direction</th>
              <th className="px-2 py-2 font-medium">UUID</th>
              <th className="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-zinc-500">
                  No active channels
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr key={ch.uuid} className="border-b border-zinc-800/80 hover:bg-zinc-800/40">
                  <td className="px-2 py-3 text-white">
                    <div>{ch.cidName || "—"}</div>
                    <div className="text-zinc-400">{ch.cidNum || "—"}</div>
                  </td>
                  <td className="px-2 py-3 text-zinc-200">{ch.dest || "—"}</td>
                  <td className="px-2 py-3">
                    <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-300 ring-1 ring-sky-500/20">
                      {ch.state || "unknown"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-zinc-400">{ch.direction || "—"}</td>
                  <td className="px-2 py-3 font-mono text-xs text-zinc-500">
                    {ch.uuid.slice(0, 8)}…
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyUuid === ch.uuid}
                        onClick={() => runAction(ch.uuid, "hangup")}
                        className="rounded-lg bg-rose-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Hangup
                      </button>
                      <button
                        type="button"
                        disabled={busyUuid === ch.uuid}
                        onClick={() => runAction(ch.uuid, "hold")}
                        className="rounded-lg bg-zinc-700 px-2.5 py-1 text-xs text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        disabled={busyUuid === ch.uuid}
                        onClick={() => runAction(ch.uuid, "unhold")}
                        className="rounded-lg bg-zinc-700 px-2.5 py-1 text-xs text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
                      >
                        Unhold
                      </button>
                      <input
                        className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white"
                        placeholder="xfer"
                        value={transferTarget[ch.uuid] ?? ""}
                        onChange={(e) =>
                          setTransferTarget((s) => ({ ...s, [ch.uuid]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={busyUuid === ch.uuid}
                        onClick={() =>
                          runAction(ch.uuid, "transfer", transferTarget[ch.uuid])
                        }
                        className="rounded-lg bg-indigo-600/90 px-2.5 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        Transfer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
