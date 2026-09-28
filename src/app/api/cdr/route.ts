import { NextResponse } from "next/server";
import { loadCdrEntries } from "@/lib/cdr";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "200");
  const entries = await loadCdrEntries(limit);
  return NextResponse.json({ entries });
}
