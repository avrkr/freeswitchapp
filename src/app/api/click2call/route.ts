import { NextResponse } from "next/server";
import { buildOriginateCommand } from "@/lib/click2call";
import { getEslManager } from "@/lib/esl/manager";
import { registerClick2Call } from "@/lib/transcription/call-tracker";
import type { Click2CallRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as Click2CallRequest;
  if (!body.agent || !body.destination) {
    return NextResponse.json(
      { error: "agent and destination are required" },
      { status: 400 },
    );
  }

  const command = buildOriginateCommand(body);
  const callId = await registerClick2Call(body.agent, body.destination);
  const manager = getEslManager();
  try {
    const result = await manager.bgapi(command);
    return NextResponse.json({
      ok: true,
      callId,
      command,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Click2call failed";
    return NextResponse.json({ error: message, command }, { status: 503 });
  }
}
