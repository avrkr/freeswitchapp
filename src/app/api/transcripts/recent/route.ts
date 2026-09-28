import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listRecentTranscripts, listTranscriptsForCall } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ configured: false, segments: [] });
  }

  const { searchParams } = new URL(req.url);
  const callId = searchParams.get("callId");
  const limit = Number(searchParams.get("limit") ?? "80");

  const segments = callId
    ? await listTranscriptsForCall(callId)
    : await listRecentTranscripts(limit);

  return NextResponse.json({
    configured: true,
    collection: "transcript_segments",
    segments: segments.reverse(),
  });
}
