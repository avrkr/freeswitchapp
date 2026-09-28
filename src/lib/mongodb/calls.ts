import { randomUUID } from "crypto";
import type { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb/client";

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
  await db.collection(TRANSCRIPTS).createIndex({ callId: 1, createdAt: 1 });
}
