import { NextResponse } from "next/server";
import { listRecordings } from "@/lib/recordings";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listRecordingsFromDb } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "100");

  if (isMongoConfigured()) {
    const dbRows = await listRecordingsFromDb(limit);
    const recordings = dbRows.map((r) => ({
      callId: r.callId,
      name: r.name,
      agent: r.agent,
      customer: r.customer,
      relativePath: r.name,
      playbackUrl: r.playbackUrl,
      modifiedAt: r.modifiedAt,
      size: 0,
      extension: r.name.split(".").pop() ?? "wav",
      durationSec: r.durationSec,
    }));
    return NextResponse.json({
      source: "mongodb",
      configured: true,
      recordings,
    });
  }

  const recordings = await listRecordings(limit);
  return NextResponse.json({
    source: "filesystem",
    configured: false,
    message: "Set MONGODB_URI for recordings from database",
    recordings,
  });
}
