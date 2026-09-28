import http from "http";
import next from "next";
import { startAudioForkServer } from "../src/lib/audio-fork/ws-server";
import { ensureIndexes } from "../src/lib/mongodb/calls";
import { fsConfig } from "../src/lib/config";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = fsConfig.appPort;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await ensureIndexes().catch((err) => {
    console.warn("[mongodb] index setup skipped:", err);
  });

  startAudioForkServer(fsConfig.audioForkPort);

  http
    .createServer((req, res) => handle(req, res))
    .listen(port, hostname, () => {
      console.log(`> Next.js http://${hostname}:${port}`);
    });
});
