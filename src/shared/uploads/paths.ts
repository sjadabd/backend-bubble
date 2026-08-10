import { mkdirSync } from "fs";
import { join, resolve } from "path";

/** Absolute directory for uploaded media (gitignored): backend/uploads */
export const UPLOADS_ROOT = resolve(import.meta.dir, "../../../uploads");

export function ensureUploadsRoot() {
  mkdirSync(UPLOADS_ROOT, { recursive: true });
  return UPLOADS_ROOT;
}

export function uploadsSubdir(...parts: string[]) {
  const dir = join(UPLOADS_ROOT, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}
