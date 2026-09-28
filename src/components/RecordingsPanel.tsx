"use client";

import { RecordingPlayer } from "@/components/shared/RecordingPlayer";
import { useCallback, useEffect, useState } from "react";

type RecordingRow = {
  callId?: string;
  name: string;
  agent?: string;
  customer?: string;
  relativePath: string;
  playbackUrl?: string | null;
  modifiedAt: string;
  size: number;
  durationSec?: number;
};

export function RecordingsPanel() {
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<RecordingRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recordings?limit=100");
      const data = (await res.json()) as {
        recordings: RecordingRow[];
        source?: string;
        message?: string;
        configured?: boolean;
      };
      setRecordings(data.recordings ?? []);
      setSource(data.source ?? "");
      setMessage(data.configured === false ? data.message ?? null : null);
      setSelected((prev) => {
        if (!prev) return data.recordings?.[0] ?? null;
        return data.recordings?.find((r) => r.callId === prev.callId || r.name === prev.name) ?? prev;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  function audioSrc(rec: RecordingRow) {
    if (rec.playbackUrl) return rec.playbackUrl;
    return `/api/recordings/${rec.relativePath.split("/").map(encodeURIComponent).join("/")}`;
  }

  return (
    <section className="rc-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Recordings library</h2>
          <p className="text-sm text-[var(--rc-muted)]">
            {source === "mongodb"
              ? "From MongoDB · playback via app (local dir or FS_RECORDINGS_HTTP_BASE)"
              : "Filesystem fallback — set MONGODB_URI"}
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

      {selected ? (
        <RecordingPlayer
          className="mb-6"
          src={audioSrc(selected)}
          title={selected.name}
          subtitle={
            selected.agent && selected.customer
              ? `${selected.agent} → ${selected.customer} · ${new Date(selected.modifiedAt).toLocaleString()}`
              : new Date(selected.modifiedAt).toLocaleString()
          }
        />
      ) : null}

      {loading && recordings.length === 0 ? (
        <p className="text-sm text-[var(--rc-muted)]">Loading recordings…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-[var(--rc-muted)]">
          No recordings yet. Enable &quot;Record &amp; transcribe&quot; on the dialpad and complete a call.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--rc-border)] rounded-xl border border-[var(--rc-border)]">
          {recordings.map((rec) => {
            const active = selected?.name === rec.name;
            return (
              <li key={rec.callId ?? rec.name}>
                <button
                  type="button"
                  onClick={() => setSelected(rec)}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                    active ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-[var(--rc-text)]">{rec.name}</p>
                    <p className="text-xs text-[var(--rc-muted)]">
                      {rec.agent && rec.customer ? `${rec.agent} → ${rec.customer} · ` : ""}
                      {new Date(rec.modifiedAt).toLocaleString()}
                      {rec.durationSec ? ` · ${rec.durationSec}s` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[var(--rc-primary)]">
                    {active ? "Playing" : "Play"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
