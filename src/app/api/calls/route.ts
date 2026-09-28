import { NextResponse } from "next/server";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";

export async function GET() {
  const manager = getEslManager();
  await manager.refreshSnapshot();
  return NextResponse.json({
    connected: manager.connected,
    channels: manager.snapshot,
  });
}
