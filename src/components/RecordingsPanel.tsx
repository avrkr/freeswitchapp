"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecordingEntry } from "@/lib/types";

export function RecordingsPanel() {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recordings?limit=100");
      const data = (await res.json()) as { recordings: RecordingEntry[] };
      setRecordings(data.recordings ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Call recordings</h2>
          <p className="text-sm text-zinc-400">Files from FreeSWITCH recordings directory</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Refresh
        </button>
      </div>

      {loading && recordings.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading recordings…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-zinc-500">No recordings yet. Enable record on click2call or use in-call record.</p>
      ) : (
        <ul className="space-y-4">
          {recordings.map((rec) => (
            <li
              key={rec.relativePath}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{rec.name}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(rec.modifiedAt).toLocaleString()} · {formatSize(rec.size)}
                  </p>
                </div>
                <a
                  className="text-xs text-sky-400 hover:underline"
                  href={`/api/recordings/${rec.relativePath}`}
                  download={rec.name}
                >
                  Download
                </a>
              </div>
              <audio
                controls
                preload="none"
                className="w-full"
                src={`/api/recordings/${rec.relativePath
                  .split("/")
                  .map(encodeURIComponent)
                  .join("/")}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
