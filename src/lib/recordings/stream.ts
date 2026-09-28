import fs from "fs/promises";
import path from "path";
import { resolveRecordingPath } from "@/lib/recordings";
import { recordingPublicUrl } from "@/lib/recordings/ensure-local";

function contentTypeFor(ext: string) {
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg") return "audio/ogg";
  return "audio/wav";
}

export async function loadRecordingBytes(relativePath: string) {
  const normalized = path.basename(relativePath.replace(/\\/g, "/"));
  try {
    const full = resolveRecordingPath(normalized);
    const data = await fs.readFile(full);
    const ext = full.split(".").pop()?.toLowerCase() ?? "wav";
    return { data, contentType: contentTypeFor(ext) };
  } catch {
    /* try remote */
  }

  const url = recordingPublicUrl(normalized);
  if (!url) return null;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = Buffer.from(await res.arrayBuffer());
  const ext = normalized.split(".").pop()?.toLowerCase() ?? "wav";
  return {
    data,
    contentType: res.headers.get("content-type") ?? contentTypeFor(ext),
  };
}
