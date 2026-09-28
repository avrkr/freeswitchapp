import path from "path";
import { fsConfig } from "@/lib/config";
import {
  createCall,
  findCallByChannelUuid,
  findCallById,
  updateCall,
} from "@/lib/mongodb/calls";
import { insertCdrRecord, insertRecordingRecord } from "@/lib/mongodb/storage";
import { getEslManager } from "@/lib/esl/manager";
import { schedulePostCallTranscription } from "@/lib/transcription/post-call";

type PendingClick2Call = {
  agent: string;
  customer: string;
  callId: string;
  record: boolean;
  createdAt: number;
};

const pending = new Map<string, PendingClick2Call>();
const uuidToCallId = new Map<string, string>();
const recordingByCall = new Map<string, { file: string; anchorUuid: string }>();
const forkedUuids = new Set<string>();
const finalizedCalls = new Set<string>();

export async function registerClick2Call(
  agent: string,
  customer: string,
  options?: { record?: boolean },
) {
  const call = await createCall({
    agent,
    customer,
    metadata: { source: "click2call", record: String(options?.record ?? true) },
  });
  if (!call) return null;
  pending.set(`${agent}:${customer}`, {
    agent,
    customer,
    callId: call.callId,
    record: options?.record ?? true,
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
  if (forkedUuids.has(uuid)) return;
  const base = fsConfig.audioForkPublicWs.replace(/\/$/, "").split("?")[0];
  const url = `${base}?callId=${encodeURIComponent(callId)}&role=${role}`;
  const manager = getEslManager();
  try {
    await manager.api(`uuid_audio_fork ${uuid} start ${url} mono 8000 L16`);
    forkedUuids.add(uuid);
  } catch {
    try {
      await manager.api(`uuid_audio_fork ${uuid} start ${url} mono 8000`);
      forkedUuids.add(uuid);
    } catch (err) {
      console.warn(
        "[audio-fork] Enable mod_audio_fork on FreeSWITCH:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

async function startCallRecording(callId: string, anchorUuid: string) {
  if (recordingByCall.has(callId)) return recordingByCall.get(callId)?.file ?? null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${fsConfig.recordingsPathOnFs}/${callId}_${stamp}.wav`;
  const manager = getEslManager();
  try {
    await manager.api(`uuid_setvar ${anchorUuid} RECORD_STEREO true`);
    await manager.api(`uuid_record ${anchorUuid} start ${file}`);
    recordingByCall.set(callId, { file, anchorUuid });
    await updateCall(callId, { recordingPath: file });
    return file;
  } catch (err) {
    console.warn("[record]", err instanceof Error ? err.message : err);
    return null;
  }
}

async function resolveCallContext(event: Record<string, string>) {
  const uuid = event["Unique-ID"];
  if (!uuid) return null;

  const existing = await findCallByChannelUuid(uuid);
  if (existing) {
    uuidToCallId.set(uuid, existing.callId);
    return {
      callId: existing.callId,
      agentExt: existing.agent,
      customerExt: existing.customer,
    };
  }

  const a = extFromEvent(event);
  const dest = (event["Caller-Destination-Number"] ?? "").replace(/\D/g, "");
  const pendingMatch = matchPendingCall(a, dest);

  if (pendingMatch) {
    await updateCall(pendingMatch.callId, { status: "active", answeredAt: new Date() });
    uuidToCallId.set(uuid, pendingMatch.callId);
    return {
      callId: pendingMatch.callId,
      agentExt: pendingMatch.agent,
      customerExt: pendingMatch.customer,
      record: pendingMatch.record,
    };
  }

  if (a && dest) {
    const created = await createCall({
      agent: a,
      customer: dest,
      metadata: { source: "esl" },
    });
    if (created) {
      await updateCall(created.callId, { status: "active", answeredAt: new Date() });
      uuidToCallId.set(uuid, created.callId);
      return {
        callId: created.callId,
        agentExt: created.agent,
        customerExt: created.customer,
        record: true,
      };
    }
  }
  return null;
}

export async function handleFsEventForTranscription(event: Record<string, string>) {
  const name = event["Event-Name"];

  if (name === "CHANNEL_ANSWER") {
    const uuid = event["Unique-ID"];
    if (!uuid) return;

    const ctx = await resolveCallContext(event);
    if (!ctx) return;

    const ext = extFromEvent(event);
    const isAgent = ext === ctx.agentExt;
    const role = isAgent ? "agent" : "customer";
    const patch =
      role === "agent"
        ? { agentChannelUuid: uuid, status: "active" as const }
        : { customerChannelUuid: uuid, status: "active" as const };
    await updateCall(ctx.callId, patch);
  }

  if (name === "CHANNEL_BRIDGE") {
    const legA = event["Bridge-A-Unique-ID"];
    const legB = event["Bridge-B-Unique-ID"];
    if (!legA || !legB) return;

    const callId =
      uuidToCallId.get(legA) ??
      uuidToCallId.get(legB) ??
      (await findCallByChannelUuid(legA))?.callId ??
      (await findCallByChannelUuid(legB))?.callId;

    if (!callId) return;

    uuidToCallId.set(legA, callId);
    uuidToCallId.set(legB, callId);

    const call = await findCallById(callId);
    if (!call) return;

    await updateCall(callId, {
      bridgeUuid: event["Unique-ID"],
      status: "active",
      agentChannelUuid: call.agentChannelUuid ?? legA,
      customerChannelUuid: call.customerChannelUuid ?? legB,
    });

    const agentUuid = call.agentChannelUuid ?? legA;
    const customerUuid = call.customerChannelUuid ?? legB;

    await startAudioFork(agentUuid, callId, "agent");
    await startAudioFork(customerUuid, callId, "customer");

    const pendingMeta = [...pending.values()].find((p) => p.callId === callId);
    const shouldRecord = pendingMeta?.record ?? true;
    if (shouldRecord) {
      await startCallRecording(callId, agentUuid);
    }
  }

  if (name === "CHANNEL_HANGUP") {
    const uuid = event["Unique-ID"];
    if (!uuid) return;
    let callId = uuidToCallId.get(uuid);
    if (!callId) {
      callId = (await findCallByChannelUuid(uuid))?.callId;
    }
    if (!callId) {
      const a = extFromEvent(event);
      const dest = (event["Caller-Destination-Number"] ?? "").replace(/\D/g, "");
      if (a || dest) {
        const created = await createCall({
          agent: a || "unknown",
          customer: dest || "unknown",
          metadata: { source: "hangup-ingest" },
        });
        callId = created?.callId;
      }
    }
    if (!callId || finalizedCalls.has(callId)) return;

    forkedUuids.delete(uuid);

    const callBefore = await findCallById(callId);
    const recMeta = recordingByCall.get(callId);
    const file =
      recMeta?.file ??
      callBefore?.recordingPath ??
      event["variable_record_path"] ??
      event["variable_bridge_pre_execute_bleg_data"];

    if (recMeta?.file && recMeta.anchorUuid) {
      try {
        const manager = getEslManager();
        await manager.api(`uuid_record ${recMeta.anchorUuid} stop ${recMeta.file}`);
      } catch {
        /* channel may already be gone */
      }
    }

    const call = callBefore ?? (await findCallById(callId));
    const endedAt = new Date();
    const startedAt = call?.startedAt ? new Date(call.startedAt) : endedAt;
    const answeredAt = call?.answeredAt ? new Date(call.answeredAt) : undefined;
    const durationSec = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
    );
    const billSec = answeredAt
      ? Math.max(0, Math.round((endedAt.getTime() - answeredAt.getTime()) / 1000))
      : Number(event["variable_billsec"] ?? 0) || 0;

    const recordingFileName = file
      ? path.basename(String(file).replace(/\\/g, "/"))
      : undefined;
    const recordingUrl = file
      ? `/api/recordings/${encodeURIComponent(recordingFileName ?? "recording.wav")}`
      : undefined;

    await updateCall(callId, {
      status: "completed",
      endedAt,
      hangupCause: event["Hangup-Cause"] ?? call?.hangupCause,
      durationSec,
      billSec,
      callerIdName: event["Caller-Caller-ID-Name"] ?? call?.callerIdName,
      callerIdNumber:
        event["Caller-Caller-ID-Number"]?.replace(/\D/g, "") ?? call?.callerIdNumber,
      destinationNumber:
        event["Caller-Destination-Number"]?.replace(/\D/g, "") ?? call?.destinationNumber,
      direction: event["Call-Direction"] ?? call?.direction,
      context: event["Caller-Context"] ?? call?.context,
      ...(file
        ? {
            recordingPath: file,
            recordingFileName,
            recordingUrl,
          }
        : {}),
    });

    finalizedCalls.add(callId);

    const updated = await findCallById(callId);
    if (updated) {
      await insertCdrRecord(updated);
      if (recordingFileName && file) {
        await insertRecordingRecord({
          callId,
          fileName: recordingFileName,
          recordingPath: file,
          agent: updated.agent,
          customer: updated.customer,
          durationSec: billSec,
          playbackUrl: recordingUrl,
        });
        schedulePostCallTranscription(callId, recordingFileName);
      }
    }

    uuidToCallId.delete(uuid);
    recordingByCall.delete(callId);
    pending.forEach((p, key) => {
      if (p.callId === callId) pending.delete(key);
    });
  }
}
