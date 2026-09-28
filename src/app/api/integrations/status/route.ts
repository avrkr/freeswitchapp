import { NextResponse } from "next/server";
import { fsConfig } from "@/lib/config";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";

export async function GET() {
  const manager = getEslManager();
  await manager.start();

  return NextResponse.json({
    esl: { connected: manager.connected, host: fsConfig.eslHost },
    mongodb: { configured: isMongoConfigured() },
    deepgram: {
      configured: Boolean(fsConfig.deepgramApiKey),
      testEndpoint: "/api/integrations/deepgram/test",
    },
    micTestWs: {
      port: fsConfig.audioForkPort,
      path: "/deepgram-mic",
    },
    recording: {
      pathOnFs: fsConfig.recordingsPathOnFs,
      httpBase: fsConfig.recordingsHttpBase || null,
      localDir: fsConfig.recordingsDir,
    },
    audioFork: { publicWs: fsConfig.audioForkPublicWs, port: fsConfig.audioForkPort },
  });
}
