import { fsConfig } from "@/lib/config";
import { createCall, findCallByChannelUuid, updateCall } from "@/lib/mongodb/calls";
import { getEslManager } from "@/lib/esl/manager";

type PendingClick2Call = {
  agent: string;
  customer: string;
  callId: string;
  createdAt: number;
};

const pending = new Map<string, PendingClick2Call>();
const uuidToCallId = new Map<string, string>();

export async function registerClick2Call(agent: string, customer: string) {
  const call = await createCall({ agent, customer, metadata: { source: "click2call" } });
  if (!call) return null;
  pending.set(`${agent}:${customer}`, {
    agent,
    customer,
    callId: call.callId,
    createdAt: Date.now(),
  });
  return call.callId;
}

function matchPendingCall(agentNum: string, customerNum: string) {
  const direct = pending.get(`${agentNum}:${customerNum}`);
  if (direct) return direct;
  for (const p of pending.values()) {
    if (
      (p.agent === agentNum && p.customer === customerNum) ||
      (p.agent === customerNum && p.customer === agentNum)
    ) {
      return p;
    }
  }
  return null;
}

function extFromEvent(event: Record<string, string>) {
  return (
    event["Caller-Caller-ID-Number"] ??
    event["variable_sip_from_user"] ??
    event["Caller-Destination-Number"] ??
    ""
  ).replace(/\D/g, "");
}

async function startAudioFork(uuid: string, callId: string, role: "agent" | "customer") {
  const base = fsConfig.audioForkPublicWs.replace(/\/$/, "").split("?")[0];
  const url = `${base}?callId=${encodeURIComponent(callId)}&role=${role}`;
  const manager = getEslManager();
  try {
    await manager.api(`uuid_audio_fork ${uuid} start ${url} mono 8000`);
  } catch (err) {
    console.warn(
      "[audio-fork] uuid_audio_fork failed (load mod_audio_fork on FreeSWITCH):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function handleFsEventForTranscription(event: Record<string, string>) {
  const name = event["Event-Name"];

  if (name === "CHANNEL_ANSWER") {
    const uuid = event["Unique-ID"];
    if (!uuid) return;

    const existing = await findCallByChannelUuid(uuid);
    let callId = existing?.callId;
    let agentExt = existing?.agent;
    let customerExt = existing?.customer;

    if (!callId) {
      const a = extFromEvent(event);
      const dest = (event["Caller-Destination-Number"] ?? "").replace(/\D/g, "");
      const pendingMatch = matchPendingCall(a, dest);
      if (pendingMatch) {
        await updateCall(pendingMatch.callId, { status: "active", answeredAt: new Date() });
        callId = pendingMatch.callId;
        agentExt = pendingMatch.agent;
        customerExt = pendingMatch.customer;
      } else if (a && dest) {
        const created = await createCall({
          agent: a,
          customer: dest,
          metadata: { source: "esl" },
        });
        if (created) {
          callId = created.callId;
          agentExt = created.agent;
          customerExt = created.customer;
          await updateCall(callId, { status: "active", answeredAt: new Date() });
        }
      }
    }
    if (!callId || !agentExt || !customerExt) return;

    const ext = extFromEvent(event);
    const isAgent = ext === agentExt;
    const role = isAgent ? "agent" : "customer";
    const patch =
      role === "agent"
        ? { agentChannelUuid: uuid, status: "active" as const }
        : { customerChannelUuid: uuid, status: "active" as const };
    await updateCall(callId, patch);
    uuidToCallId.set(uuid, callId);
    await startAudioFork(uuid, callId, role);
  }

  if (name === "CHANNEL_BRIDGE") {
    const a = event["Bridge-A-Unique-ID"];
    const b = event["Bridge-B-Unique-ID"];
    const callId = (a && uuidToCallId.get(a)) || (b && uuidToCallId.get(b));
    if (callId) {
      await updateCall(callId, { bridgeUuid: event["Unique-ID"], status: "active" });
    }
  }

  if (name === "CHANNEL_HANGUP") {
    const uuid = event["Unique-ID"];
    if (!uuid) return;
    const callId = uuidToCallId.get(uuid);
    if (!callId) return;

    const rec = event["variable_bridge_pre_execute_bleg_data"] ?? event["variable_record_path"];
    await updateCall(callId, {
      status: "completed",
      endedAt: new Date(),
      hangupCause: event["Hangup-Cause"],
      ...(rec ? { recordingPath: rec } : {}),
    });
    uuidToCallId.delete(uuid);
    pending.forEach((p, key) => {
      if (p.callId === callId) pending.delete(key);
    });
  }
}
