import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listActiveCalls, recordingPlaybackUrl } from "@/lib/mongodb/calls";

export const runtime = "nodejs";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ configured: false, calls: [] });
  }

  const calls = await listActiveCalls(15);
  return NextResponse.json({
    configured: true,
    calls: calls.map((c) => ({
      callId: c.callId,
      agent: c.agent,
      customer: c.customer,
      status: c.status,
      startedAt: c.startedAt,
      answeredAt: c.answeredAt,
      agentChannelUuid: c.agentChannelUuid,
      customerChannelUuid: c.customerChannelUuid,
      recordingPath: c.recordingPath,
      recordingUrl: recordingPlaybackUrl(c),
    })),
  });
}
