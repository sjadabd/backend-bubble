import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { websiteController } from "./website.controller";

export const websiteRoutes = new Elysia({ prefix: "/admin/website" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "website.manage");
    const url = new URL(request.url);
    return websiteController.list(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .get("/:id", async ({ user, params }) => {
    requirePermissionCheck(user, "website.manage");
    return websiteController.get(params);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await websiteController.create(body);
    writeAuditLog({
      action: "website.section.create",
      actorId: user.id,
      targetId: result.data.section.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/website",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await websiteController.update(params, body);
    writeAuditLog({
      action: "website.section.update",
      actorId: user.id,
      targetId: result.data.section.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/website/${result.data.section.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await websiteController.remove(params);
    writeAuditLog({
      action: "website.section.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/website/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await websiteController.restore(params);
    writeAuditLog({
      action: "website.section.restore",
      actorId: user.id,
      targetId: result.data.section.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/website/${result.data.section.id}/restore`,
    });
    return result;
  });
