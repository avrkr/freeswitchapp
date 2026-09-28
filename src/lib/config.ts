import path from "path";

function resolvePath(envPath: string | undefined, fallback: string) {
  const raw = envPath ?? fallback;
  return path.isAbsolute(raw)
    ? raw
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), raw);
}

export const fsConfig = {
  eslHost: process.env.FS_ESL_HOST ?? "127.0.0.1",
  eslPort: Number(process.env.FS_ESL_PORT ?? "8021"),
  eslPassword: process.env.FS_ESL_PASSWORD ?? "ClueCon",
  domain: process.env.FS_DOMAIN ?? "127.0.0.1",
  recordingsDir: resolvePath(
    process.env.FS_RECORDINGS_DIR,
    path.join(process.cwd(), "..", "freeswitchlocal", "recordings"),
  ),
  cdrDir: resolvePath(
    process.env.FS_CDR_DIR,
    path.join(process.cwd(), "..", "freeswitchlocal", "log", "cdr-csv"),
  ),
  recordingsPathOnFs:
    process.env.FS_RECORDINGS_PATH_ON_FS ?? "/usr/local/freeswitch/recordings",
  /** Optional HTTP base to fetch/serve WAV from FreeSWITCH host (e.g. http://192.168.43.137/recordings) */
  recordingsHttpBase: process.env.FS_RECORDINGS_HTTP_BASE ?? "",
  mongodbUri: process.env.MONGODB_URI ?? "",
  deepgramApiKey: process.env.DEEPGRAM_API_KEY ?? "",
  /** WebSocket URL FreeSWITCH mod_audio_fork uses (must reach this app from FS host) */
  audioForkPublicWs:
    process.env.AUDIO_FORK_PUBLIC_WS ?? "ws://127.0.0.1:3001/fork",
  audioForkPort: Number(process.env.AUDIO_FORK_PORT ?? "3001"),
  appPort: Number(process.env.PORT ?? "3000"),
};
