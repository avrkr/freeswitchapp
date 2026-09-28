import { randomUUID } from "crypto";
import type { ObjectId } from "mongodb";
import path from "path";
import { getMongoDb } from "@/lib/mongodb/client";
import { fsConfig } from "@/lib/config";
import type { CallRole } from "@/lib/types";

export type CallDocument = {
  _id?: ObjectId;
  callId: string;
  agent: string;
  customer: string;
  status: "ringing" | "active" | "completed" | "failed";
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  hangupCause?: string;
  agentChannelUuid?: string;
  customerChannelUuid?: string;
  bridgeUuid?: string;
  recordingPath?: string;
  recordingUrl?: string;
  recordingFileName?: string;
  durationSec?: number;
  billSec?: number;
  callerIdName?: string;
  callerIdNumber?: string;
  destinationNumber?: string;
  direction?: string;
  context?: string;
  metadata?: Record<string, string>;
};

export type TranscriptSegment = {
  _id?: ObjectId;
  callId: string;
  role: CallRole;
  text: string;
  isFinal: boolean;
  confidence?: number;
  createdAt: Date;
};

export type CdrRow = {
  callId: string;
  callerIdName: string;
  callerIdNumber: string;
  destinationNumber: string;
  agent: string;
  customer: string;
  startStamp: string;
  answerStamp: string;
  endStamp: string;
  duration: string;
  billsec: string;
  hangupCause: string;
  recordingPath?: string;
  recordingUrl?: string;
};

export type DbRecordingRow = {
  callId: string;
  name: string;
  agent: string;
  customer: string;
  recordingPath: string;
  playbackUrl: string | null;
  modifiedAt: string;
  durationSec?: number;
};

export type AnalyticsSummary = {
  totalCalls: number;
  completedCalls: number;
  activeCalls: number;
  withRecording: number;
  avgBillSec: number;
  totalBillSec: number;
  callsLast24h: number;
};

const CALLS = "calls";
const TRANSCRIPTS = "transcript_segments";

export async function createCall(input: {
  agent: string;
  customer: string;
  metadata?: Record<string, string>;
}) {
  const db = await getMongoDb();
  if (!db) return null;

  const callId = randomUUID();
  const doc: CallDocument = {
    callId,
    agent: input.agent,
    customer: input.customer,
    status: "ringing",
    startedAt: new Date(),
    callerIdNumber: input.agent,
    destinationNumber: input.customer,
    metadata: input.metadata,
  };
  await db.collection<CallDocument>(CALLS).insertOne(doc);
  return doc;
}

export async function updateCall(
  callId: string,
  patch: Partial<Omit<CallDocument, "callId">>,
) {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection<CallDocument>(CALLS).updateOne({ callId }, { $set: patch });
}

export async function findCallById(callId: string) {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<CallDocument>(CALLS).findOne({ callId });
}

export async function findCallByChannelUuid(uuid: string) {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<CallDocument>(CALLS).findOne({
    $or: [{ agentChannelUuid: uuid }, { customerChannelUuid: uuid }],
  });
}

export async function listCalls(limit = 50) {
  const db = await getMongoDb();
  if (!db) return [];
  return db
    .collection<CallDocument>(CALLS)
    .find({})
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();
}

function callToCdrRow(call: CallDocument): CdrRow {
  return {
    callId: call.callId,
    callerIdName: call.callerIdName ?? call.agent,
    callerIdNumber: call.callerIdNumber ?? call.agent,
    destinationNumber: call.destinationNumber ?? call.customer,
    agent: call.agent,
    customer: call.customer,
    startStamp: call.startedAt?.toISOString?.() ?? String(call.startedAt),
    answerStamp: call.answeredAt?.toISOString?.() ?? "",
    endStamp: call.endedAt?.toISOString?.() ?? "",
    duration: String(call.durationSec ?? 0),
    billsec: String(call.billSec ?? 0),
    hangupCause: call.hangupCause ?? "",
    recordingPath: call.recordingPath,
    recordingUrl: call.recordingUrl,
  };
}

export async function listCdrFromDb(limit = 200): Promise<CdrRow[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const calls = await db
    .collection<CallDocument>(CALLS)
    .find({ status: { $in: ["completed", "failed"] } })
    .sort({ endedAt: -1, startedAt: -1 })
    .limit(limit)
    .toArray();

  return calls.map(callToCdrRow);
}

export function recordingPlaybackUrl(call: CallDocument): string | null {
  if (call.recordingUrl) return call.recordingUrl;
  const fileName =
    call.recordingFileName ??
    (call.recordingPath ? path.basename(call.recordingPath.replace(/\\/g, "/")) : null);
  if (!fileName) return null;
  return `/api/recordings/${fileName.split("/").map(encodeURIComponent).join("/")}`;
}

export async function listRecordingsFromDb(limit = 100): Promise<DbRecordingRow[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const calls = await db
    .collection<CallDocument>(CALLS)
    .find({
      recordingPath: { $exists: true, $type: "string", $ne: "" },
    })
    .sort({ endedAt: -1, startedAt: -1 })
    .limit(limit)
    .toArray();

  return calls.map((call) => {
    const name =
      call.recordingFileName ??
      path.basename((call.recordingPath ?? "recording.wav").replace(/\\/g, "/"));
    return {
      callId: call.callId,
      name,
      agent: call.agent,
      customer: call.customer,
      recordingPath: call.recordingPath ?? "",
      playbackUrl: recordingPlaybackUrl(call),
      modifiedAt: (call.endedAt ?? call.startedAt).toISOString(),
      durationSec: call.billSec ?? call.durationSec,
    };
  });
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const col = db.collection<CallDocument>(CALLS);

  const [totalCalls, completedCalls, activeCalls, withRecording, agg, last24] =
    await Promise.all([
      col.countDocuments({}),
      col.countDocuments({ status: "completed" }),
      col.countDocuments({ status: { $in: ["ringing", "active"] } }),
      col.countDocuments({
        recordingPath: { $exists: true, $type: "string", $ne: "" },
      }),
      col
        .aggregate<{ avgBill: number; sumBill: number }>([
          { $match: { billSec: { $exists: true, $gt: 0 } } },
          {
            $group: {
              _id: null,
              avgBill: { $avg: "$billSec" },
              sumBill: { $sum: "$billSec" },
            },
          },
        ])
        .toArray(),
      col.countDocuments({ startedAt: { $gte: since } }),
    ]);

  const stats = agg[0];
  return {
    totalCalls,
    completedCalls,
    activeCalls,
    withRecording,
    avgBillSec: Math.round(stats?.avgBill ?? 0),
    totalBillSec: Math.round(stats?.sumBill ?? 0),
    callsLast24h: last24,
  };
}

export async function insertTranscriptSegment(segment: Omit<TranscriptSegment, "createdAt">) {
  const db = await getMongoDb();
  if (!db) return null;

  const doc: TranscriptSegment = { ...segment, createdAt: new Date() };
  await db.collection<TranscriptSegment>(TRANSCRIPTS).insertOne(doc);
  return doc;
}

export async function listTranscriptsForCall(callId: string) {
  const db = await getMongoDb();
  if (!db) return [];
  return db
    .collection<TranscriptSegment>(TRANSCRIPTS)
    .find({ callId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function ensureIndexes() {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection(CALLS).createIndex({ callId: 1 }, { unique: true });
  await db.collection(CALLS).createIndex({ startedAt: -1 });
  await db.collection(CALLS).createIndex({ endedAt: -1 });
  await db.collection(CALLS).createIndex({ status: 1 });
  await db.collection(TRANSCRIPTS).createIndex({ callId: 1, createdAt: 1 });
}
