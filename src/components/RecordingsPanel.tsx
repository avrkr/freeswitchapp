"use client";

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
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Recordings</h2>
          <p className="text-sm text-[var(--rc-muted)]">
            {source === "mongodb"
              ? "From MongoDB (calls with recordingPath)"
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

      {loading && recordings.length === 0 ? (
        <p className="text-sm text-[var(--rc-muted)]">Loading recordings…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-[var(--rc-muted)]">
          No recordings in database. Enable &quot;Record &amp; transcribe&quot; on dialpad and complete a call.
        </p>
      ) : (
        <ul className="space-y-4">
          {recordings.map((rec) => (
            <li key={rec.callId ?? rec.name} className="rounded-xl border border-[var(--rc-border)] bg-gray-50 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--rc-text)]">{rec.name}</p>
                  <p className="text-xs text-[var(--rc-muted)]">
                    {rec.agent && rec.customer ? `${rec.agent} → ${rec.customer} · ` : ""}
                    {new Date(rec.modifiedAt).toLocaleString()}
                    {rec.durationSec ? ` · ${rec.durationSec}s` : ""}
                  </p>
                </div>
                <a
                  className="text-xs font-medium text-[var(--rc-primary)] hover:underline"
                  href={audioSrc(rec)}
                  download={rec.name}
                >
                  Download
                </a>
              </div>
              <audio controls preload="none" className="w-full" src={audioSrc(rec)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
