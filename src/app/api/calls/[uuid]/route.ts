import { NextResponse } from "next/server";
import { fsConfig } from "@/lib/config";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";

type Params = { params: Promise<{ uuid: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { uuid } = await params;
  try {
    const manager = getEslManager();
    const result = await manager.api(`uuid_kill ${uuid}`);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hangup failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const { uuid } = await params;
  const body = (await req.json()) as { action: string; target?: string };

  try {
    const manager = getEslManager();

    switch (body.action) {
    case "hold": {
      const result = await manager.api(`uuid_hold ${uuid}`);
      return NextResponse.json({ ok: true, result });
    }
    case "unhold": {
      const result = await manager.api(`uuid_hold off ${uuid}`);
      return NextResponse.json({ ok: true, result });
    }
    case "record_start": {
      const file =
        body.target ??
        `${fsConfig.recordingsPathOnFs}/manual_${uuid.slice(0, 8)}_${Date.now()}.wav`;
      await manager.api(`uuid_setvar ${uuid} RECORD_STEREO true`);
      const result = await manager.api(`uuid_record ${uuid} start ${file}`);
      return NextResponse.json({ ok: true, result });
    }
    case "record_stop": {
      const result = await manager.api(`uuid_record ${uuid} stop`);
      return NextResponse.json({ ok: true, result });
    }
    case "mute": {
      const result = await manager.api(`uuid_media off ${uuid}`);
      return NextResponse.json({ ok: true, result });
    }
    case "unmute": {
      const result = await manager.api(`uuid_media on ${uuid}`);
      return NextResponse.json({ ok: true, result });
    }
    case "transfer": {
      if (!body.target) {
        return NextResponse.json({ error: "target extension required" }, { status: 400 });
      }
      const result = await manager.api(
        `uuid_transfer ${uuid} ${body.target} XML default`,
      );
      return NextResponse.json({ ok: true, result });
    }
    case "eavesdrop": {
      if (!body.target) {
        return NextResponse.json({ error: "eavesdrop extension required" }, { status: 400 });
      }
      const result = await manager.bgapi(
        `originate user/${body.target}@${fsConfig.domain} &eavesdrop(${uuid})`,
      );
      return NextResponse.json({ ok: true, result });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Call action failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
