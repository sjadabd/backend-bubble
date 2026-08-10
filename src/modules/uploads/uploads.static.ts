import { Elysia } from "elysia";
import {
  ensureUploadsRoot,
  resolveSafeUploadPath,
} from "@shared/uploads";

/**
 * Public static media: GET /uploads/2026/08/uuid.webp
 */
export const uploadsStaticRoutes = new Elysia({ name: "uploads-static" })
  .onStart(() => {
    ensureUploadsRoot();
  })
  .get("/uploads/*", async ({ params, set }) => {
    const relative = String((params as { "*": string })["*"] ?? "");
    const absolute = resolveSafeUploadPath(relative);
    if (!absolute) {
      set.status = 404;
      return "Not Found";
    }
    const bunFile = Bun.file(absolute);
    if (!(await bunFile.exists())) {
      set.status = 404;
      return "Not Found";
    }
    set.headers["cache-control"] = "public, max-age=31536000, immutable";
    return bunFile;
  });
