import { Elysia } from "elysia";
import {
  authenticatePlugin,
  hasPermission,
  authorize,
} from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { AppError } from "@shared/errors";
import { statusCodes } from "@constants/statusCodes";
import type { AuthUser } from "@shared/types";
import type { Permission } from "@constants/permissions";
import { MAX_UPLOAD_BYTES, saveImageBuffer } from "@shared/uploads";

const UPLOAD_PERMS: Permission[] = [
  "products.manage",
  "categories.manage",
  "promotions.manage",
  "website.manage",
];

function requireUploadPermission(user: AuthUser) {
  authorize(user);
  if (user.role === "super_admin") return;
  if (!UPLOAD_PERMS.some((p) => hasPermission(user, p))) {
    throw new AppError("ليس لديك صلاحية لرفع الصور", statusCodes.FORBIDDEN);
  }
}

export const uploadAdminRoutes = new Elysia({ prefix: "/admin/uploads" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .post("/", async ({ user, request }) => {
    requireUploadPermission(user);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new AppError(
        "ارفع الصورة كـ multipart/form-data مع الحقل file",
        statusCodes.BAD_REQUEST,
      );
    }

    const form = await request.formData();
    const entry = form.get("file");
    if (!entry || typeof entry === "string") {
      throw new AppError("لم يتم إرسال ملف الصورة (file)", statusCodes.BAD_REQUEST);
    }

    const blob = entry as File;
    const mime = blob.type || "application/octet-stream";
    if (!mime.startsWith("image/")) {
      throw new AppError(
        "يرجى اختيار ملف صورة صالح (PNG أو JPG أو WebP).",
        statusCodes.BAD_REQUEST,
      );
    }
    if (typeof blob.size === "number" && blob.size > MAX_UPLOAD_BYTES) {
      throw new AppError(
        "حجم الصورة أكبر من الحد المسموح (8 ميجابايت).",
        statusCodes.BAD_REQUEST,
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const saved = await saveImageBuffer(buffer, mime);

    writeAuditLog({
      action: "upload.create",
      actorId: user.id,
      targetId: saved.relativePath,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/uploads",
    });

    return {
      success: true,
      message: "تم رفع الصورة بنجاح",
      data: {
        url: saved.url,
        path: saved.relativePath,
        mime: saved.mime,
        size: saved.size,
      },
    };
  });
