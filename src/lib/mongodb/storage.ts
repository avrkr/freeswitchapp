import { getMongoDb } from "@/lib/mongodb/client";
import type { CallDocument, CdrRow } from "@/lib/mongodb/calls";
import { callToCdrRow } from "@/lib/mongodb/calls";

export type CdrDocument = CdrRow & { createdAt: Date };
export type RecordingDocument = {
  callId: string;
  fileName: string;
  recordingPath: string;
  agent: string;
  customer: string;
  durationSec?: number;
  playbackUrl?: string;
  createdAt: Date;
};

const CDR = "cdr";
const RECORDINGS = "recordings";

export async function insertCdrRecord(call: CallDocument) {
  const db = await getMongoDb();
  if (!db) return;
  const row = callToCdrRow(call);
  await db.collection<CdrDocument>(CDR).updateOne(
    { callId: call.callId },
    { $set: { ...row, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function insertRecordingRecord(input: {
  callId: string;
  fileName: string;
  recordingPath: string;
  agent: string;
  customer: string;
  durationSec?: number;
  playbackUrl?: string;
}) {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection<RecordingDocument>(RECORDINGS).updateOne(
    { callId: input.callId },
    {
      $set: {
        ...input,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function listCdrCollection(limit = 200) {
  const db = await getMongoDb();
  if (!db) return [];
  return db.collection<CdrDocument>(CDR).find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function listRecordingsCollection(limit = 100) {
  const db = await getMongoDb();
  if (!db) return [];
  return db
    .collection<RecordingDocument>(RECORDINGS)
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function ensureStorageIndexes() {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection(CDR).createIndex({ callId: 1 }, { unique: true });
  await db.collection(CDR).createIndex({ createdAt: -1 });
  await db.collection(RECORDINGS).createIndex({ callId: 1 }, { unique: true });
  await db.collection(RECORDINGS).createIndex({ createdAt: -1 });
}

export async function listDbCollections() {
  const db = await getMongoDb();
  if (!db) return [];
  return db.listCollections().toArray();
}
