import path from "path";

function resolvePath(envPath: string | undefined, fallback: string) {
  const raw = envPath ?? fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
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
};
