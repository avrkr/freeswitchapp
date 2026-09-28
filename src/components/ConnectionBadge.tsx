"use client";

type Props = {
  connected: boolean;
  lastEvent?: string | null;
  error?: string | null;
};

export function ConnectionBadge({ connected, lastEvent, error }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${
          connected
            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
            : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}
        />
        {connected ? "ESL connected" : "ESL offline"}
      </span>
      {lastEvent ? (
        <span className="text-zinc-400">Last event: {lastEvent}</span>
      ) : null}
      {error ? <span className="text-amber-400">{error}</span> : null}
    </div>
  );
}
