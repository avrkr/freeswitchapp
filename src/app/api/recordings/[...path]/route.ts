import { NextResponse } from "next/server";
import { loadRecordingBytes } from "@/lib/recordings/stream";

export const runtime = "nodejs";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const { path: parts } = await params;
  const relative = parts.join("/");
  const loaded = await loadRecordingBytes(relative);
  if (!loaded) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(loaded.data), {
    headers: {
      "Content-Type": loaded.contentType,
      "Cache-Control": "private, max-age=3600",
      "Accept-Ranges": "bytes",
    },
  });
}
