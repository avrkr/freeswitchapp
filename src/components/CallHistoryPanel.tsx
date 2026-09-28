"use client";

import { RecordingPlayer } from "@/components/shared/RecordingPlayer";
import { useCallback, useEffect, useState } from "react";

type CallRow = {
  callId: string;
  agent: string;
  customer: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  recordingPath?: string;
  recordingUrl?: string | null;
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
        recordingUrl: data.call.recordingUrl ?? null,
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
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Call history</h2>
          <p className="text-sm text-[var(--rc-muted)]">Transcripts, recording playback, and metadata</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--rc-border)] bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {!configured ? (
        <p className="text-sm text-amber-700">{message ?? "Configure MONGODB_URI in .env.local"}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-[var(--rc-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-[var(--rc-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[var(--rc-muted)]">
                    No calls stored yet
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr
                    key={c.callId}
                    className="cursor-pointer border-t border-[var(--rc-border)] hover:bg-gray-50"
                    onClick={() => void openCall(c.callId)}
                  >
                    <td className="px-3 py-2">{c.agent}</td>
                    <td className="px-3 py-2">{c.customer}</td>
                    <td className="px-3 py-2 text-[var(--rc-muted)]">{c.status}</td>
                    <td className="px-3 py-2 text-[var(--rc-muted)]">
                      {new Date(c.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-[var(--rc-border)] bg-gray-50/50 p-4 text-sm">
          {!selected ? (
            <p className="text-[var(--rc-muted)]">Select a call for transcript and recording</p>
          ) : (
            <>
              <p className="mb-1 font-semibold text-[var(--rc-text)]">
                {selected.call.agent} → {selected.call.customer}
              </p>
              <p className="mb-4 text-xs text-[var(--rc-muted)]">
                {selected.call.status}
                {selected.call.endedAt
                  ? ` · ended ${new Date(selected.call.endedAt).toLocaleString()}`
                  : ""}
              </p>

              {selected.call.recordingUrl ? (
                <RecordingPlayer
                  className="mb-4"
                  src={selected.call.recordingUrl}
                  title="Call recording"
                  subtitle={selected.call.recordingPath}
                />
              ) : (
                <p className="mb-4 rounded-lg border border-dashed border-[var(--rc-border)] px-3 py-2 text-xs text-[var(--rc-muted)]">
                  No recording for this call
                </p>
              )}

              <p className="mb-2 text-xs font-semibold uppercase text-[var(--rc-muted)]">Transcript</p>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {selected.transcripts.length === 0 ? (
                  <p className="text-[var(--rc-muted)]">No transcript yet</p>
                ) : (
                  selected.transcripts.map((t, i) => (
                    <p key={i} className="text-[var(--rc-text)]">
                      <span
                        className={
                          t.role === "agent"
                            ? "font-medium text-[var(--rc-primary)]"
                            : "font-medium text-[var(--rc-accent)]"
                        }
                      >
                        {t.role}:
                      </span>{" "}
                      {t.text}
                    </p>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
