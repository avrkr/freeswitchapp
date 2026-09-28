import path from "path";
import { listCalls } from "@/lib/mongodb/calls";
import { insertCdrRecord, insertRecordingRecord } from "@/lib/mongodb/storage";
import { schedulePostCallTranscription } from "@/lib/transcription/post-call";
import { isMongoConfigured } from "@/lib/mongodb/client";

export async function backfillMongoCollections() {
  if (!isMongoConfigured()) return;

  const calls = await listCalls(300);
  let cdrCount = 0;
  let recCount = 0;
  for (const call of calls) {
    if (
      call.status === "completed" ||
      call.status === "failed" ||
      call.endedAt
    ) {
      await insertCdrRecord(call);
      cdrCount++;
    }
    const fileName =
      call.recordingFileName ??
      (call.recordingPath
        ? path.basename(String(call.recordingPath).replace(/\\/g, "/"))
        : undefined);
    if (fileName && call.recordingPath) {
      await insertRecordingRecord({
        callId: call.callId,
        fileName,
        recordingPath: call.recordingPath,
        agent: call.agent,
        customer: call.customer,
        durationSec: call.billSec,
        playbackUrl:
          call.recordingUrl ??
          `/api/recordings/${encodeURIComponent(fileName)}`,
      });
      schedulePostCallTranscription(call.callId, fileName);
      recCount++;
    }
  }
  console.log(`[mongodb] backfill: cdr upserts=${cdrCount} recordings=${recCount} (from ${calls.length} calls)`);
}
