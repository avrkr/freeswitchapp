import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import http from "http";
import next from "next";
import { startAudioForkServer } from "../src/lib/audio-fork/ws-server";
import { ensureIndexes } from "../src/lib/mongodb/calls";
import { ensureStorageIndexes } from "../src/lib/mongodb/storage";
import { backfillMongoCollections } from "../src/lib/mongodb/backfill";
import { fsConfig, isDeepgramConfigured } from "../src/lib/config";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = fsConfig.appPort;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  if (!isDeepgramConfigured()) {
    console.warn(
      "[env] DEEPGRAM_API_KEY is empty — add it to .env.local in the app folder and restart",
    );
  } else {
    console.log("[env] DEEPGRAM_API_KEY loaded");
  }

  await ensureIndexes().catch((err) => {
    console.warn("[mongodb] index setup skipped:", err);
  });
  await ensureStorageIndexes().catch((err) => {
    console.warn("[mongodb] storage indexes skipped:", err);
  });
  await backfillMongoCollections().catch((err) => {
    console.warn("[mongodb] backfill skipped:", err);
  });

  startAudioForkServer(fsConfig.audioForkPort);

  http
    .createServer((req, res) => handle(req, res))
    .listen(port, hostname, () => {
      console.log(`> Next.js http://${hostname}:${port}`);
    });
});
