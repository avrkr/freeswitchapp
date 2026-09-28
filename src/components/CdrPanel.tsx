"use client";

import { useCallback, useEffect, useState } from "react";
import type { CdrEntry } from "@/lib/types";

export function CdrPanel() {
  const [entries, setEntries] = useState<CdrEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cdr?limit=150");
      const data = (await res.json()) as { entries: CdrEntry[] };
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">CDR history</h2>
          <p className="text-sm text-zinc-400">Parsed from FreeSWITCH Master.csv</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-zinc-400">
            <tr className="border-b border-zinc-800">
              <th className="px-2 py-2">From</th>
              <th className="px-2 py-2">To</th>
              <th className="px-2 py-2">Start</th>
              <th className="px-2 py-2">Bill sec</th>
              <th className="px-2 py-2">Hangup</th>
            </tr>
          </thead>
          <tbody>
            {loading && entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-zinc-500">
                  Loading CDR…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-zinc-500">
                  No CDR rows yet (mod_cdr_csv Master.csv)
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.uuid + row.startStamp} className="border-b border-zinc-800/80">
                  <td className="px-2 py-2 text-zinc-200">
                    {row.callerIdName || row.callerIdNumber}
                  </td>
                  <td className="px-2 py-2 text-zinc-200">{row.destinationNumber}</td>
                  <td className="px-2 py-2 text-zinc-400">{row.startStamp}</td>
                  <td className="px-2 py-2 text-zinc-300">{row.billsec}s</td>
                  <td className="px-2 py-2 text-zinc-500">{row.hangupCause}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
