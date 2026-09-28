"use client";

import { CheckCircle2, Loader2, Mic, MicOff, Radio, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  deepgramConfigured: boolean;
  micWsPort?: number;
};

type WsMsg =
  | { type: "ready"; sampleRate: number }
  | { type: "transcript"; text: string; isFinal: boolean }
  | { type: "error"; message: string };

function floatTo16BitPCM(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function micWsUrl(port: number) {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:${port}/deepgram-mic`;
}

export function DeepgramTestPanel({ deepgramConfigured, micWsPort = 3001 }: Props) {
  const [testState, setTestState] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalLines, setFinalLines] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanupMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  useEffect(() => () => cleanupMic(), [cleanupMic]);

  async function testConnection() {
    setTestState("loading");
    setTestMessage(null);
    try {
      const res = await fetch("/api/integrations/deepgram/test", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setTestState("fail");
        setTestMessage(data.error ?? "Test failed");
        return;
      }
      setTestState("ok");
      setTestMessage(data.message ?? "Connected");
    } catch (e) {
      setTestState("fail");
      setTestMessage(e instanceof Error ? e.message : "Network error");
    }
  }

  async function toggleListen() {
    if (listening) {
      cleanupMic();
      return;
    }

    if (!deepgramConfigured) {
      setMicError("Set DEEPGRAM_API_KEY first, then run Test connection");
      return;
    }

    setMicError(null);
    setFinalLines([]);
    setInterim("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ws = new WebSocket(micWsUrl(micWsPort));
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket failed — is npm run dev running port 3001?"));
        setTimeout(() => reject(new Error("WebSocket timeout")), 8000);
      });

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const sampleRate = audioCtx.sampleRate;

      let readyResolve: (() => void) | null = null;
      let readyReject: ((err: Error) => void) | null = null;
      const readyPromise = new Promise<void>((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
        setTimeout(() => reject(new Error("Deepgram live session did not start")), 10000);
      });

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WsMsg;
          if (msg.type === "error") {
            setMicError(msg.message);
            readyReject?.(new Error(msg.message));
            cleanupMic();
          } else if (msg.type === "ready") {
            readyResolve?.();
          } else if (msg.type === "transcript") {
            if (msg.isFinal) {
              setFinalLines((prev) => [...prev, msg.text]);
              setInterim("");
            } else {
              setInterim(msg.text);
            }
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => cleanupMic();

      ws.send(JSON.stringify({ type: "start", sampleRate }));
      await readyPromise;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const channel = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(channel);
        ws.send(pcm.buffer);
      };

      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioCtx.destination);

      setListening(true);
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "Microphone error");
      cleanupMic();
    }
  }

  return (
    <div className="rc-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Deepgram test</h2>
          <p className="text-xs text-[var(--rc-muted)]">
            Verify API key · speak into your mic for live captions (same engine as call transcript)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={testState === "loading"}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--rc-border)] bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {testState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testState === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : testState === "fail" ? (
              <WifiOff className="h-4 w-4 text-red-600" />
            ) : (
              <Radio className="h-4 w-4 text-[var(--rc-primary)]" />
            )}
            Test connection
          </button>
          <button
            type="button"
            onClick={() => void toggleListen()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              listening
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[var(--rc-primary)] hover:bg-[var(--rc-primary-hover)]"
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? "Stop speaking" : "Speak (live)"}
          </button>
        </div>
      </div>

      {testMessage ? (
        <p
          className={`mb-3 text-sm ${testState === "ok" ? "text-emerald-700" : testState === "fail" ? "text-red-700" : "text-[var(--rc-muted)]"}`}
        >
          {testMessage}
        </p>
      ) : null}

      {micError ? <p className="mb-3 text-sm text-red-700">{micError}</p> : null}

      <div className="min-h-[140px] rounded-xl border border-[var(--rc-border)] bg-gray-50 p-4">
        {listening ? (
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Listening… speak now
          </p>
        ) : (
          <p className="mb-2 text-xs text-[var(--rc-muted)]">
            Click <strong>Speak (live)</strong> after a successful connection test
          </p>
        )}

        <div className="space-y-2 text-sm text-[var(--rc-text)]">
          {finalLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {interim ? (
            <p className="italic text-[var(--rc-muted)]">{interim}</p>
          ) : finalLines.length === 0 && !listening ? (
            <p className="text-[var(--rc-muted)]">Transcript will appear here</p>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-[var(--rc-muted)]">
        Mic WebSocket: {micWsUrl(micWsPort)} · allow browser microphone when prompted
      </p>
    </div>
  );
}
