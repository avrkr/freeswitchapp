import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import {
  findCallById,
  listTranscriptsForCall,
  recordingPlaybackUrl,
} from "@/lib/mongodb/calls";

export const runtime = "nodejs";

type Params = { params: Promise<{ callId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { callId } = await params;
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  const call = await findCallById(callId);
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const transcripts = await listTranscriptsForCall(callId);
  return NextResponse.json({
    call: {
      ...call,
      recordingUrl: recordingPlaybackUrl(call),
    },
    transcripts,
  });
}
