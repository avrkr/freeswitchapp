import { NextResponse } from "next/server";
import { fsConfig } from "@/lib/config";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";

export async function GET() {
  const manager = getEslManager();
  await manager.start();
  await manager.refreshSnapshot();
  return NextResponse.json({
    connected: manager.connected,
    eslError: manager.lastError,
    esl: {
      host: fsConfig.eslHost,
      port: fsConfig.eslPort,
    },
    domain: fsConfig.domain,
    recordingsDir: fsConfig.recordingsDir,
    cdrDir: fsConfig.cdrDir,
  });
}
