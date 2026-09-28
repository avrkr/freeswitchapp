import fs from "fs/promises";
import { NextResponse } from "next/server";
import { resolveRecordingPath } from "@/lib/recordings";

export const runtime = "nodejs";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const { path: parts } = await params;
  const relative = parts.join("/");
  try {
    const full = resolveRecordingPath(relative);
    const data = await fs.readFile(full);
    const ext = full.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "mp3"
        ? "audio/mpeg"
        : ext === "ogg"
          ? "audio/ogg"
          : "audio/wav";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
}
