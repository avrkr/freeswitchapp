"use client";

import { useLiveTranscripts } from "@/hooks/useLiveTranscripts";

function Column({
  title,
  subtitle,
  lines,
  accent,
}: {
  title: string;
  subtitle: string;
  lines: { text: string; isFinal: boolean; at: string }[];
  accent: string;
}) {
  return (
    <div className="flex min-h-80 flex-col rounded-xl border border-zinc-800 bg-zinc-950/50">
      <div className={`border-b border-zinc-800 px-4 py-3 ${accent}`}>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {lines.length === 0 ? (
          <p className="text-zinc-500">Waiting for speech…</p>
        ) : (
          lines.map((line, i) => (
            <p
              key={`${line.at}-${i}`}
              className={line.isFinal ? "text-zinc-200" : "text-zinc-500 italic"}
            >
              {line.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export function LiveTranscriptPanel() {
  const { agentLines, customerLines } = useLiveTranscripts();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Live transcript</h2>
        <p className="text-sm text-zinc-400">
          Deepgram streaming — agent and customer legs (requires mod_audio_fork + DEEPGRAM_API_KEY)
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Column
          title="Agent"
          subtitle="Extension / agent leg"
          lines={agentLines}
          accent="bg-emerald-500/10"
        />
        <Column
          title="Customer"
          subtitle="Destination / customer leg"
          lines={customerLines}
          accent="bg-sky-500/10"
        />
      </div>
    </section>
  );
}
