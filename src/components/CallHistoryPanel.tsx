"use client";

import { useCallback, useEffect, useState } from "react";

type CallRow = {
  callId: string;
  agent: string;
  customer: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  recordingPath?: string;
  hangupCause?: string;
};

type Detail = {
  call: CallRow;
  transcripts: { role: string; text: string; createdAt: string }[];
};

export function CallHistoryPanel() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/history/calls?limit=50");
    const data = (await res.json()) as {
      configured?: boolean;
      message?: string;
      calls?: CallRow[];
    };
    setConfigured(data.configured !== false);
    setMessage(data.message ?? null);
    setCalls(
      (data.calls ?? []).map((c) => ({
        ...c,
        startedAt: String(c.startedAt),
        endedAt: c.endedAt ? String(c.endedAt) : undefined,
      })),
    );
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function openCall(callId: string) {
    const res = await fetch(`/api/history/calls/${callId}`);
    if (!res.ok) return;
    const data = (await res.json()) as Detail;
    setSelected({
      call: {
        ...data.call,
        startedAt: String(data.call.startedAt),
        endedAt: data.call.endedAt ? String(data.call.endedAt) : undefined,
      },
      transcripts: data.transcripts.map((t) => ({
        ...t,
        createdAt: String(t.createdAt),
      })),
    });
  }

  return (
    <section className="rc-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Call history</h2>
          <p className="text-sm text-zinc-400">MongoDB — calls, recordings, transcripts</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Refresh
        </button>
      </div>

      {!configured ? (
        <p className="text-amber-400 text-sm">{message ?? "Configure MONGODB_URI in .env.local"}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Customer</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-zinc-500">
                    No calls stored yet
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr
                    key={c.callId}
                    className="cursor-pointer border-b border-zinc-800/80 hover:bg-zinc-800/40"
                    onClick={() => void openCall(c.callId)}
                  >
                    <td className="px-2 py-2">{c.agent}</td>
                    <td className="px-2 py-2">{c.customer}</td>
                    <td className="px-2 py-2 text-zinc-400">{c.status}</td>
                    <td className="px-2 py-2 text-zinc-500">
                      {new Date(c.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm">
          {!selected ? (
            <p className="text-zinc-500">Select a call for transcript + recording info</p>
          ) : (
            <>
              <p className="mb-2 font-medium text-white">
                {selected.call.agent} → {selected.call.customer}
              </p>
              {selected.call.recordingPath ? (
                <p className="mb-2 text-xs text-zinc-400 break-all">
                  Recording: {selected.call.recordingPath}
                </p>
              ) : null}
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {selected.transcripts.map((t, i) => (
                  <p key={i} className="text-zinc-300">
                    <span className="text-emerald-400">{t.role}:</span> {t.text}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
