import fs from "fs/promises";
import path from "path";
import { createClient } from "@deepgram/sdk";
import { fsConfig } from "@/lib/config";
import {
  insertTranscriptSegment,
  listTranscriptsForCall,
} from "@/lib/mongodb/calls";
import {
  ensureRecordingLocal,
  recordingPublicUrl,
} from "@/lib/recordings/ensure-local";
import type { CallRole } from "@/lib/types";
import { emitLiveTranscript } from "@/lib/transcription/bus";

const pendingJobs = new Set<string>();

function roleForChannel(index: number): CallRole {
  return index === 0 ? "agent" : "customer";
}

async function saveSegment(callId: string, role: CallRole, text: string, confidence?: number) {
  await insertTranscriptSegment({
    callId,
    role,
    text,
    isFinal: true,
    confidence,
    source: "post-call",
  });
  emitLiveTranscript({
    callId,
    role,
    text,
    isFinal: true,
    at: new Date().toISOString(),
  });
}

const dgOptions = {
  model: "nova-2",
  smart_format: true,
  punctuate: true,
  multichannel: true,
  utterances: true,
} as const;

async function runDeepgram(
  deepgram: ReturnType<typeof createClient>,
  source: Buffer | { url: string },
) {
  if (Buffer.isBuffer(source)) {
    return deepgram.listen.prerecorded.transcribeFile(source, { ...dgOptions });
  }
  return deepgram.listen.prerecorded.transcribeUrl(source, { ...dgOptions });
}

export async function transcribeRecordingFile(callId: string, fileName: string) {
  if (!fsConfig.deepgramApiKey) {
    console.warn("[transcript] DEEPGRAM_API_KEY not set");
    return false;
  }

  const existing = await listTranscriptsForCall(callId);
  if (existing.some((s) => s.source === "post-call" && s.isFinal)) {
    return true;
  }

  const deepgram = createClient(fsConfig.deepgramApiKey);
  let result;
  let error;

  const localPath = await ensureRecordingLocal(fileName);
  if (localPath) {
    const buffer = await fs.readFile(localPath);
    if (buffer.length < 1000) {
      return false;
    }
    ({ result, error } = await runDeepgram(deepgram, buffer));
  } else {
    const url = recordingPublicUrl(fileName);
    if (!url) {
      console.warn(
        "[transcript] recording not on app disk; set FS_RECORDINGS_HTTP_BASE or copy WAV to FS_RECORDINGS_DIR",
      );
      return false;
    }
    ({ result, error } = await runDeepgram(deepgram, { url }));
  }

  if (error) {
    console.error("[transcript] Deepgram error:", error);
    return false;
  }

  const channels = result?.results?.channels ?? [];
  const utterances = (result?.results?.utterances ?? []) as Array<{
    transcript?: string;
    channel?: number;
  }>;
  if (utterances.length > 0) {
    for (const u of utterances) {
      const text = u.transcript?.trim();
      if (!text) continue;
      await saveSegment(callId, roleForChannel(u.channel ?? 0), text);
    }
    return true;
  }

  if (channels.length >= 2) {
    for (let i = 0; i < channels.length; i++) {
      const text = channels[i]?.alternatives?.[0]?.transcript?.trim();
      if (text) {
        await saveSegment(callId, roleForChannel(i), text, channels[i]?.alternatives?.[0]?.confidence);
      }
    }
  } else {
    const text = channels[0]?.alternatives?.[0]?.transcript?.trim();
    if (text) {
      await saveSegment(callId, "agent", text, channels[0]?.alternatives?.[0]?.confidence);
    }
  }

  return true;
}

export function schedulePostCallTranscription(callId: string, fileName: string, attempt = 0) {
  const jobKey = `${callId}:${fileName}`;
  if (pendingJobs.has(jobKey) && attempt === 0) return;
  pendingJobs.add(jobKey);

  const maxAttempts = 15;
  const delayMs = Math.min(4000 + attempt * 3000, 45000);

  setTimeout(() => {
    void (async () => {
      try {
        const ok = await transcribeRecordingFile(callId, fileName);
        if (ok) {
          pendingJobs.delete(jobKey);
          return;
        }
      } catch {
        /* file not ready */
      }

      if (attempt + 1 < maxAttempts) {
        schedulePostCallTranscription(callId, fileName, attempt + 1);
      } else {
        pendingJobs.delete(jobKey);
        console.warn("[transcript] recording not found for post-call:", fileName);
      }
    })();
  }, delayMs);
}

export function localPathForRecording(fileName: string) {
  return path.join(fsConfig.recordingsDir, path.basename(fileName));
}
