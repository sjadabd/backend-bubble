import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { attributeController } from "./attribute.controller";

export const attributeRoutes = new Elysia({ prefix: "/admin/attributes" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "products.manage");
    const url = new URL(request.url);
    return attributeController.list(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.create(body);
    writeAuditLog({
      action: "attribute.create",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/attributes",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.update(params, body);
    writeAuditLog({
      action: "attribute.update",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.attribute.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.remove(params);
    writeAuditLog({
      action: "attribute.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.restore(params);
    writeAuditLog({
      action: "attribute.restore",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.attribute.id}/restore`,
    });
    return result;
  })
  .post("/:id/values", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.addValue(params, body);
    writeAuditLog({
      action: "attribute.update",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.attribute.id}/values`,
    });
    return result;
  })
  .patch("/:id/values/:valueId", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.updateValue(params, body);
    writeAuditLog({
      action: "attribute.update",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.attribute.id}/values`,
    });
    return result;
  })
  .delete("/:id/values/:valueId", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await attributeController.removeValue(params);
    writeAuditLog({
      action: "attribute.update",
      actorId: user.id,
      targetId: result.data.attribute.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/attributes/${result.data.attribute.id}/values`,
    });
    return result;
  });
