import fs from "fs/promises";
import path from "path";
import { fsConfig } from "@/lib/config";
import { resolveRecordingPath } from "@/lib/recordings";

/** Local path for playback / Deepgram file upload */
export async function ensureRecordingLocal(fileName: string): Promise<string | null> {
  const base = path.basename(fileName.replace(/\\/g, "/"));
  let localPath: string;
  try {
    localPath = resolveRecordingPath(base);
  } catch {
    return null;
  }

  try {
    const stat = await fs.stat(localPath);
    if (stat.size > 500) return localPath;
  } catch {
    /* missing */
  }

  const httpBase = fsConfig.recordingsHttpBase?.replace(/\/$/, "");
  if (!httpBase) {
    return null;
  }

  const url = `${httpBase}/${encodeURIComponent(base)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[recordings] HTTP fetch failed:", res.status, url);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;
    await fs.mkdir(fsConfig.recordingsDir, { recursive: true });
    await fs.writeFile(localPath, buf);
    console.log("[recordings] pulled from FS host:", base);
    return localPath;
  } catch (err) {
    console.warn(
      "[recordings] could not download recording:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Public URL for Deepgram prerecorded transcribeUrl (when WAV stays on FS) */
export function recordingPublicUrl(fileName: string): string | null {
  const base = fsConfig.recordingsHttpBase?.replace(/\/$/, "");
  if (!base) return null;
  const baseName = path.basename(fileName.replace(/\\/g, "/"));
  return `${base}/${encodeURIComponent(baseName)}`;
}
