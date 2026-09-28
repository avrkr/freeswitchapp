"use client";

import { useCallback, useEffect, useState } from "react";

type CdrRow = {
  callId?: string;
  callerIdName: string;
  callerIdNumber: string;
  destinationNumber: string;
  startStamp: string;
  billsec: string;
  duration: string;
  hangupCause: string;
};

export function CdrPanel() {
  const [entries, setEntries] = useState<CdrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cdr?limit=150");
      const data = (await res.json()) as {
        entries: CdrRow[];
        source?: string;
        message?: string;
        configured?: boolean;
      };
      setEntries(data.entries ?? []);
      setSource(data.source ?? "");
      setMessage(data.configured === false ? data.message ?? null : null);
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
    <section className="rc-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">CDR</h2>
          <p className="text-sm text-[var(--rc-muted)]">
            {source === "mongodb" ? "MongoDB call detail records" : "Fallback CSV / configure MongoDB"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--rc-border)] bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {message ? <p className="mb-3 text-sm text-amber-700">{message}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-[var(--rc-muted)]">
            <tr>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Bill sec</th>
              <th className="px-3 py-2">Hangup</th>
            </tr>
          </thead>
          <tbody>
            {loading && entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--rc-muted)]">
                  Loading CDR…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--rc-muted)]">
                  No completed calls in MongoDB yet. Place a call with MONGODB_URI set.
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={(row.callId ?? "") + row.startStamp} className="border-t border-[var(--rc-border)]">
                  <td className="px-3 py-2">{row.callerIdName || row.callerIdNumber}</td>
                  <td className="px-3 py-2">{row.destinationNumber}</td>
                  <td className="px-3 py-2 text-[var(--rc-muted)]">
                    {row.startStamp ? new Date(row.startStamp).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{row.duration}s</td>
                  <td className="px-3 py-2">{row.billsec}s</td>
                  <td className="px-3 py-2 text-[var(--rc-muted)]">{row.hangupCause}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
