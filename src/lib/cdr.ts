import fs from "fs/promises";
import path from "path";
import type { CdrEntry } from "@/lib/types";
import { fsConfig } from "@/lib/config";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export async function loadCdrEntries(limit = 200): Promise<CdrEntry[]> {
  const master = path.join(fsConfig.cdrDir, "Master.csv");
  try {
    const raw = await fs.readFile(master, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const tail = lines.slice(-limit).reverse();
    return tail.map((line) => {
      const cols = parseCsvLine(line);
      return {
        callerIdName: cols[0] ?? "",
        callerIdNumber: cols[1] ?? "",
        destinationNumber: cols[2] ?? "",
        context: cols[3] ?? "",
        startStamp: cols[4] ?? "",
        answerStamp: cols[5] ?? "",
        endStamp: cols[6] ?? "",
        duration: cols[7] ?? "",
        billsec: cols[8] ?? "",
        hangupCause: cols[9] ?? "",
        uuid: cols[10] ?? "",
        blegUuid: cols[11] ?? "",
        accountcode: cols[12] ?? "",
        readCodec: cols[13] ?? "",
        writeCodec: cols[14] ?? "",
      };
    });
  } catch {
    return [];
  }
}
