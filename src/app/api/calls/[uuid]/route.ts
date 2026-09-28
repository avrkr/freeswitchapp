import { NextResponse } from "next/server";
import { fsConfig } from "@/lib/config";
import { getEslManager } from "@/lib/esl/manager";

export const runtime = "nodejs";

type Params = { params: Promise<{ uuid: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { uuid } = await params;
  const manager = getEslManager();
  const result = await manager.api(`uuid_kill ${uuid}`);
  return NextResponse.json({ ok: true, result });
}

export async function POST(req: Request, { params }: Params) {
  const { uuid } = await params;
  const body = (await req.json()) as { action: string; target?: string };
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
      const file = body.target;
      if (!file) {
        return NextResponse.json({ error: "target path required" }, { status: 400 });
      }
      const result = await manager.api(`uuid_record ${uuid} start ${file}`);
      return NextResponse.json({ ok: true, result });
    }
    case "record_stop": {
      const result = await manager.api(`uuid_record ${uuid} stop`);
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
}
