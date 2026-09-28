import { NextResponse } from "next/server";
import path from "path";
import { findCallById } from "@/lib/mongodb/calls";
import { schedulePostCallTranscription } from "@/lib/transcription/post-call";

export const runtime = "nodejs";

type Params = { params: Promise<{ callId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { callId } = await params;
  const call = await findCallById(callId);
  if (!call?.recordingFileName && !call?.recordingPath) {
    return NextResponse.json({ error: "No recording on this call" }, { status: 404 });
  }
  const fileName =
    call.recordingFileName ??
    path.basename(String(call.recordingPath).replace(/\\/g, "/"));
  schedulePostCallTranscription(callId, fileName);
  return NextResponse.json({ ok: true, fileName });
}
