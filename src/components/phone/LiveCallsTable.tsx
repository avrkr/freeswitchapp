"use client";

import { Headphones, MicOff, PhoneOff, PhoneForwarded } from "lucide-react";
import type { LiveChannel } from "@/lib/types";
import { useState } from "react";

type Props = {
  channels: LiveChannel[];
  connected: boolean;
};

export function LiveCallsTable({ channels, connected }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [xfer, setXfer] = useState<Record<string, string>>({});

  async function action(uuid: string, type: string, target?: string) {
    setBusy(uuid);
    try {
      if (type === "hangup") {
        await fetch(`/api/calls/${uuid}`, { method: "DELETE" });
      } else {
        await fetch(`/api/calls/${uuid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: type, target }),
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rc-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--rc-border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Active calls</h2>
          <p className="text-xs text-[var(--rc-muted)]">
            {connected ? `${channels.length} in progress` : "Reconnecting to PBX…"}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--rc-primary)]">
          Live
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-[var(--rc-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Caller</th>
              <th className="px-5 py-3 font-medium">Destination</th>
              <th className="px-5 py-3 font-medium">State</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[var(--rc-muted)]">
                  No active calls
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr key={ch.uuid} className="border-t border-[var(--rc-border)]">
                  <td className="px-5 py-4">
                    <p className="font-medium">{ch.cidName || ch.cidNum || "—"}</p>
                    <p className="text-xs text-[var(--rc-muted)]">{ch.cidNum}</p>
                  </td>
                  <td className="px-5 py-4">{ch.dest || "—"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {ch.state || "active"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === ch.uuid}
                        onClick={() => action(ch.uuid, "hangup")}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <PhoneOff className="h-3.5 w-3.5" /> End
                      </button>
                      <button
                        type="button"
                        onClick={() => action(ch.uuid, "hold")}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                      >
                        <MicOff className="h-3.5 w-3.5" /> Hold
                      </button>
                      <input
                        className="w-16 rounded border border-[var(--rc-border)] px-2 py-1 text-xs"
                        placeholder="ext"
                        value={xfer[ch.uuid] ?? ""}
                        onChange={(e) => setXfer((s) => ({ ...s, [ch.uuid]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => action(ch.uuid, "transfer", xfer[ch.uuid])}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs text-[var(--rc-primary)]"
                      >
                        <PhoneForwarded className="h-3.5 w-3.5" /> Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => action(ch.uuid, "record_start")}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs"
                      >
                        <Headphones className="h-3.5 w-3.5" /> Rec
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
