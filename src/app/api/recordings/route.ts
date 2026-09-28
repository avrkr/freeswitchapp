import { NextResponse } from "next/server";
import { listRecordings } from "@/lib/recordings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const recordings = await listRecordings(limit);
  return NextResponse.json({ recordings });
}
