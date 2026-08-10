import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join, resolve } from "path";
import { env } from "@config/env";
import { AppError } from "@shared/errors";
import { statusCodes } from "@constants/statusCodes";
import { UPLOADS_ROOT, ensureUploadsRoot, uploadsSubdir } from "./paths";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB binary

export type SavedUpload = {
  /** Absolute public URL for browsers */
  url: string;
  /** Path relative to uploads root, e.g. 2026/08/uuid.webp */
  relativePath: string;
  mime: string;
  size: number;
};

function publicUrlFor(relativePath: string) {
  const base = env.publicApiUrl.replace(/\/$/, "");
  return `${base}/uploads/${relativePath.replace(/\\/g, "/")}`;
}

function yearMonth() {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { y, m };
}

export async function saveImageBuffer(
  buffer: Buffer | Uint8Array,
  mime: string,
  options?: { preferredExt?: string },
): Promise<SavedUpload> {
  ensureUploadsRoot();
  const normalizedMime = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  const ext = options?.preferredExt ?? ALLOWED_MIME[normalizedMime] ?? null;
  if (!ext) {
    throw new AppError(
      "نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WebP.",
      statusCodes.BAD_REQUEST,
    );
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError(
      "حجم الصورة أكبر من الحد المسموح (8 ميجابايت).",
      statusCodes.BAD_REQUEST,
    );
  }
  if (buffer.byteLength < 24) {
    throw new AppError("ملف الصورة غير صالح.", statusCodes.BAD_REQUEST);
  }

  const { y, m } = yearMonth();
  const fileName = `${randomUUID()}.${ext}`;
  const relativePath = `${y}/${m}/${fileName}`;
  const dir = uploadsSubdir(y, m);
  await writeFile(join(dir, fileName), buffer);

  return {
    url: publicUrlFor(relativePath),
    relativePath,
    mime: normalizedMime,
    size: buffer.byteLength,
  };
}

export async function saveImageDataUrl(dataUrl: string): Promise<SavedUpload> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new AppError("صيغة data URL غير صالحة.", statusCodes.BAD_REQUEST);
  }
  const mime = match[1]!.toLowerCase();
  const b64 = match[2]!;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    throw new AppError("تعذّر فك تشفير الصورة.", statusCodes.BAD_REQUEST);
  }
  return saveImageBuffer(buffer, mime);
}

export function isDataImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** Resolve a stored relative path under uploads; rejects path traversal. */
export function resolveSafeUploadPath(relativePath: string): string | null {
  ensureUploadsRoot();
  const cleaned = relativePath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const parts = cleaned.split("/").filter(Boolean);
  if (!parts.length || parts.some((p) => p === ".." || p === ".")) return null;
  const absolute = resolve(UPLOADS_ROOT, ...parts);
  if (!absolute.startsWith(UPLOADS_ROOT)) return null;
  return absolute;
}
