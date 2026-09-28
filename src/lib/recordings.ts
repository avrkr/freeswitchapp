import fs from "fs/promises";
import path from "path";
import type { RecordingEntry } from "@/lib/types";
import { fsConfig } from "@/lib/config";

const AUDIO_EXT = new Set([".wav", ".mp3", ".ogg"]);

async function walk(dir: string, base: string, acc: RecordingEntry[] = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, base, acc);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!AUDIO_EXT.has(ext)) continue;
    const stat = await fs.stat(full);
    acc.push({
      name: entry.name,
      relativePath: path.relative(base, full).split(path.sep).join("/"),
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      extension: ext.slice(1),
    });
  }
  return acc;
}

export async function listRecordings(limit = 100): Promise<RecordingEntry[]> {
  await fs.mkdir(fsConfig.recordingsDir, { recursive: true });
  const all = await walk(fsConfig.recordingsDir, fsConfig.recordingsDir);
  return all
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, limit);
}

export function resolveRecordingPath(relativePath: string) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(fsConfig.recordingsDir, normalized);
  if (!full.startsWith(fsConfig.recordingsDir)) {
    throw new Error("Invalid recording path");
  }
  return full;
}
