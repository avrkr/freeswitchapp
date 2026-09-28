import { NextResponse } from "next/server";
import { loadCdrEntries } from "@/lib/cdr";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listCdrFromDb } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "200");

  if (isMongoConfigured()) {
    const entries = await listCdrFromDb(limit);
    return NextResponse.json({
      source: "mongodb",
      configured: true,
      entries,
    });
  }

  const entries = await loadCdrEntries(limit);
  return NextResponse.json({
    source: "csv",
    configured: false,
    message: "Set MONGODB_URI for CDR from database",
    entries: entries.map((e) => ({
      callId: e.uuid,
      callerIdName: e.callerIdName,
      callerIdNumber: e.callerIdNumber,
      destinationNumber: e.destinationNumber,
      agent: e.callerIdNumber,
      customer: e.destinationNumber,
      startStamp: e.startStamp,
      answerStamp: e.answerStamp,
      endStamp: e.endStamp,
      duration: e.duration,
      billsec: e.billsec,
      hangupCause: e.hangupCause,
    })),
  });
}
