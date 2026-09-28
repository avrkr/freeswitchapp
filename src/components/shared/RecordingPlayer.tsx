"use client";

import { Download, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function RecordingPlayer({ src, title, subtitle, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
  }, [src]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => setError("Playback failed — file may still be on the PBX only"));
    } else {
      el.pause();
    }
  }

  function fmt(sec: number) {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className={`rounded-xl border border-[var(--rc-border)] bg-gradient-to-b from-gray-50 to-white p-4 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title ? <p className="font-semibold text-[var(--rc-text)]">{title}</p> : null}
          {subtitle ? <p className="text-xs text-[var(--rc-muted)]">{subtitle}</p> : null}
        </div>
      )}

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (!el) return;
          setProgress(el.currentTime);
        }}
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (el) setDuration(el.duration);
        }}
        onError={() =>
          setError(
            "Could not load audio. Set FS_RECORDINGS_HTTP_BASE or copy the WAV into FS_RECORDINGS_DIR.",
          )
        }
      />

      {error ? (
        <p className="text-sm text-amber-800">{error}</p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--rc-primary)] text-white shadow-sm hover:bg-[var(--rc-primary-hover)]"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={progress}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                el.currentTime = Number(e.target.value);
                setProgress(el.currentTime);
              }}
              className="h-1.5 w-full cursor-pointer accent-[var(--rc-primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--rc-muted)]">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <Volume2 className="hidden h-5 w-5 text-[var(--rc-muted)] sm:block" />

          <a
            href={src}
            download
            className="rounded-lg border border-[var(--rc-border)] p-2 text-[var(--rc-primary)] hover:bg-gray-50"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
