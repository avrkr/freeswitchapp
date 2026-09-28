import { createClient } from "@deepgram/sdk";
import { NextResponse } from "next/server";
import { fsConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST() {
  if (!fsConfig.deepgramApiKey) {
    return NextResponse.json(
      { ok: false, error: "DEEPGRAM_API_KEY is not set in environment" },
      { status: 400 },
    );
  }

  const deepgram = createClient(fsConfig.deepgramApiKey);
  const { result, error } = await deepgram.manage.getProjects();

  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: string }).message)
        : "Deepgram API rejected the key";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }

  const projects = result?.projects ?? [];
  return NextResponse.json({
    ok: true,
    projectCount: projects.length,
    message:
      projects.length > 0
        ? `Connected — ${projects.length} project(s) on this API key`
        : "API key accepted (no projects listed)",
  });
}
