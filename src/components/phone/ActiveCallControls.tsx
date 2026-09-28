"use client";

import {
  Mic,
  MicOff,
  Pause,
  PhoneForwarded,
  PhoneOff,
  Play,
  Radio,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { LiveChannel } from "@/lib/types";

type ActiveCall = {
  callId: string;
  agent: string;
  customer: string;
  status: string;
  startedAt: string;
  agentChannelUuid?: string;
  customerChannelUuid?: string;
};

type Props = {
  channels: LiveChannel[];
  connected: boolean;
  focusCallId?: string | null;
  onFocusCallId?: (callId: string | null) => void;
};

type LegState = {
  onHold: boolean;
  muted: boolean;
  recording: boolean;
};

export function ActiveCallControls({
  channels,
  connected,
  focusCallId,
  onFocusCallId,
}: Props) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [xferTo, setXferTo] = useState<Record<string, string>>({});
  const [legState, setLegState] = useState<Record<string, LegState>>({});
  const [toast, setToast] = useState<string | null>(null);

  const loadActive = useCallback(async () => {
    const res = await fetch("/api/calls/active");
    const data = (await res.json()) as { calls?: ActiveCall[] };
    setActiveCalls(data.calls ?? []);
  }, []);

  useEffect(() => {
    void loadActive();
    const t = setInterval(() => void loadActive(), 3000);
    return () => clearInterval(t);
  }, [loadActive]);

  useEffect(() => {
    if (!focusCallId && activeCalls[0]?.callId) {
      onFocusCallId?.(activeCalls[0].callId);
    }
  }, [activeCalls, focusCallId, onFocusCallId]);

  async function run(uuid: string, action: string, target?: string) {
    setBusy(`${uuid}:${action}`);
    setToast(null);
    try {
      let res: Response;
      if (action === "hangup") {
        res = await fetch(`/api/calls/${uuid}`, { method: "DELETE" });
      } else {
        res = await fetch(`/api/calls/${uuid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, target }),
        });
      }
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setToast(data.error ?? "Action failed");
        return;
      }
      setToast(action === "hangup" ? "Call ended" : `${action} sent`);
      if (action === "hold") {
        setLegState((s) => ({
          ...s,
          [uuid]: { ...defaultLeg(s[uuid]), onHold: true },
        }));
      }
      if (action === "unhold") {
        setLegState((s) => ({
          ...s,
          [uuid]: { ...defaultLeg(s[uuid]), onHold: false },
        }));
      }
      if (action === "mute") {
        setLegState((s) => ({
          ...s,
          [uuid]: { ...defaultLeg(s[uuid]), muted: true },
        }));
      }
      if (action === "unmute") {
        setLegState((s) => ({
          ...s,
          [uuid]: { ...defaultLeg(s[uuid]), muted: false },
        }));
      }
      if (action === "record_start") {
        setLegState((s) => ({
          ...s,
          [uuid]: { ...defaultLeg(s[uuid]), recording: true },
        }));
      }
      void loadActive();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 3500);
    }
  }

  function defaultLeg(prev?: LegState): LegState {
    return prev ?? { onHold: false, muted: false, recording: false };
  }

  function primaryUuid(call: ActiveCall) {
    return call.agentChannelUuid ?? call.customerChannelUuid ?? null;
  }

  function channelFor(call: ActiveCall) {
    const uuid = primaryUuid(call);
    if (uuid) {
      const ch = channels.find((c) => c.uuid === uuid);
      if (ch) return ch;
    }
    return channels.find(
      (c) =>
        c.cidNum?.replace(/\D/g, "") === call.agent ||
        c.dest?.replace(/\D/g, "") === call.customer,
    );
  }

  function elapsed(startedAt: string) {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const displayCalls =
    activeCalls.length > 0
      ? activeCalls
      : channels.slice(0, 5).map((ch) => ({
          callId: ch.uuid,
          agent: ch.cidNum || "—",
          customer: ch.dest || "—",
          status: ch.state || "active",
          startedAt: new Date().toISOString(),
          agentChannelUuid: ch.uuid,
        }));

  return (
    <div className="rc-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--rc-border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Call controls</h2>
          <p className="text-xs text-[var(--rc-muted)]">
            {connected ? "Hold · mute · transfer · record · end" : "Reconnecting to PBX…"}
          </p>
        </div>
        {toast ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            {toast}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        {displayCalls.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--rc-muted)]">No active calls</p>
        ) : (
          displayCalls.map((call) => {
            const ch = channelFor(call);
            const uuid = ch?.uuid ?? primaryUuid(call) ?? call.callId;
            const state = legState[uuid] ?? defaultLeg();
            const focused = focusCallId === call.callId;
            const isBusy = busy?.startsWith(uuid);

            return (
              <div
                key={call.callId}
                className={`rounded-xl border p-4 transition-colors ${
                  focused
                    ? "border-[var(--rc-primary)] bg-blue-50/40"
                    : "border-[var(--rc-border)] bg-white"
                }`}
              >
                <button
                  type="button"
                  className="mb-3 w-full text-left"
                  onClick={() => onFocusCallId?.(call.callId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-[var(--rc-text)]">
                        {call.agent}{" "}
                        <span className="font-normal text-[var(--rc-muted)]">→</span>{" "}
                        {call.customer}
                      </p>
                      <p className="text-xs text-[var(--rc-muted)]">
                        {call.status} · {elapsed(call.startedAt)}
                        {focused ? " · transcript linked" : ""}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Live
                    </span>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {state.onHold ? (
                    <ControlBtn
                      label="Resume"
                      icon={<Play className="h-4 w-4" />}
                      variant="primary"
                      disabled={!!isBusy}
                      onClick={() => void run(uuid, "unhold")}
                    />
                  ) : (
                    <ControlBtn
                      label="Hold"
                      icon={<Pause className="h-4 w-4" />}
                      disabled={!!isBusy}
                      onClick={() => void run(uuid, "hold")}
                    />
                  )}

                  {state.muted ? (
                    <ControlBtn
                      label="Unmute"
                      icon={<Mic className="h-4 w-4" />}
                      disabled={!!isBusy}
                      onClick={() => void run(uuid, "unmute")}
                    />
                  ) : (
                    <ControlBtn
                      label="Mute"
                      icon={<MicOff className="h-4 w-4" />}
                      disabled={!!isBusy}
                      onClick={() => void run(uuid, "mute")}
                    />
                  )}

                  <ControlBtn
                    label={state.recording ? "Recording" : "Record"}
                    icon={<Radio className={`h-4 w-4 ${state.recording ? "text-red-600" : ""}`} />}
                    disabled={!!isBusy}
                    onClick={() => void run(uuid, "record_start")}
                  />

                  <ControlBtn
                    label="End call"
                    icon={<PhoneOff className="h-4 w-4" />}
                    variant="danger"
                    disabled={!!isBusy}
                    onClick={() => {
                      void run(uuid, "hangup");
                      if (focusCallId === call.callId) onFocusCallId?.(null);
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PhoneForwarded className="h-4 w-4 text-[var(--rc-muted)]" />
                  <input
                    className="min-w-[5rem] flex-1 rounded-lg border border-[var(--rc-border)] px-3 py-2 text-sm"
                    placeholder="Transfer to ext"
                    value={xferTo[call.callId] ?? ""}
                    onChange={(e) =>
                      setXferTo((s) => ({ ...s, [call.callId]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={!!isBusy || !xferTo[call.callId]?.trim()}
                    onClick={() => void run(uuid, "transfer", xferTo[call.callId]?.trim())}
                    className="rounded-lg bg-[var(--rc-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--rc-primary-hover)] disabled:opacity-50"
                  >
                    Transfer
                  </button>
                </div>

                {ch ? (
                  <p className="mt-2 truncate text-[10px] text-[var(--rc-muted)]">
                    Leg {ch.uuid.slice(0, 8)}… · {ch.state}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ControlBtn({
  label,
  icon,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const styles =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "primary"
        ? "bg-[var(--rc-primary)] text-white hover:bg-[var(--rc-primary-hover)]"
        : "bg-gray-100 text-[var(--rc-text)] hover:bg-gray-200";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold disabled:opacity-50 ${styles}`}
    >
      {icon}
      {label}
    </button>
  );
}
