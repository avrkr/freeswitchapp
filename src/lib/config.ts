import path from "path";

function env(key: string, fallback = "") {
  const v = process.env[key];
  if (v === undefined || v === null) return fallback;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolvePath(envPath: string | undefined, fallback: string) {
  const raw = envPath && envPath.trim() ? envPath.trim() : fallback;
  return path.isAbsolute(raw)
    ? raw
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), raw);
}

/** Read env on each access so custom server + Next share .env.local after loadEnvConfig */
export const fsConfig = {
  get eslHost() {
    return env("FS_ESL_HOST", "127.0.0.1");
  },
  get eslPort() {
    return Number(env("FS_ESL_PORT", "8021"));
  },
  get eslPassword() {
    return env("FS_ESL_PASSWORD", "ClueCon");
  },
  get domain() {
    return env("FS_DOMAIN", "127.0.0.1");
  },
  get recordingsDir() {
    return resolvePath(
      process.env.FS_RECORDINGS_DIR,
      path.join(process.cwd(), "..", "freeswitchlocal", "recordings"),
    );
  },
  get cdrDir() {
    return resolvePath(
      process.env.FS_CDR_DIR,
      path.join(process.cwd(), "..", "freeswitchlocal", "log", "cdr-csv"),
    );
  },
  get recordingsPathOnFs() {
    return env("FS_RECORDINGS_PATH_ON_FS", "/usr/local/freeswitch/recordings");
  },
  get recordingsHttpBase() {
    return env("FS_RECORDINGS_HTTP_BASE");
  },
  get mongodbUri() {
    return env("MONGODB_URI");
  },
  get deepgramApiKey() {
    return env("DEEPGRAM_API_KEY");
  },
  get audioForkPublicWs() {
    return env("AUDIO_FORK_PUBLIC_WS", "ws://127.0.0.1:3001/fork");
  },
  get audioForkPort() {
    return Number(env("AUDIO_FORK_PORT", "3001"));
  },
  get appPort() {
    return Number(env("PORT", "3000"));
  },
};

export function isDeepgramConfigured() {
  return fsConfig.deepgramApiKey.length > 0;
}
