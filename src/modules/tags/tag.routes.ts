import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { tagController } from "./tag.controller";

export const tagRoutes = new Elysia({ prefix: "/admin/tags" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "products.manage");
    const url = new URL(request.url);
    return tagController.list(Object.fromEntries(url.searchParams.entries()));
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await tagController.create(body);
    writeAuditLog({
      action: "tag.create",
      actorId: user.id,
      targetId: result.data.tag.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/tags",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await tagController.update(params, body);
    writeAuditLog({
      action: "tag.update",
      actorId: user.id,
      targetId: result.data.tag.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/tags/${result.data.tag.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await tagController.remove(params);
    writeAuditLog({
      action: "tag.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/tags/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await tagController.restore(params);
    writeAuditLog({
      action: "tag.restore",
      actorId: user.id,
      targetId: result.data.tag.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/tags/${result.data.tag.id}/restore`,
    });
    return result;
  });
