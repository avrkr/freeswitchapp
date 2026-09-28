import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getAnalyticsSummary } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "Set MONGODB_URI in .env.local",
      summary: null,
    });
  }

  const summary = await getAnalyticsSummary();
  return NextResponse.json({ configured: true, summary });
}
