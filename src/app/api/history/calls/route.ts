import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listCalls } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json({
      configured: false,
      calls: [],
      message: "Set MONGODB_URI in .env.local",
    });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const calls = await listCalls(limit);
  return NextResponse.json({ configured: true, calls });
}
