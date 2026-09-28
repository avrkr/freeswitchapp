import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listDbCollections } from "@/lib/mongodb/storage";

export const runtime = "nodejs";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({
      configured: false,
      collections: [],
      expected: ["calls", "transcript_segments", "cdr", "recordings"],
    });
  }

  const cols = await listDbCollections();
  return NextResponse.json({
    configured: true,
    collections: cols.map((c) => c.name),
    expected: ["calls", "transcript_segments", "cdr", "recordings"],
  });
}
