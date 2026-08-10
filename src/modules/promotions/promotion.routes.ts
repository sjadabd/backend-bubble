import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { promotionController } from "./promotion.controller";

export const promotionRoutes = new Elysia({ prefix: "/admin/promotions" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "promotions.manage");
    const url = new URL(request.url);
    return promotionController.list(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .get("/:id", async ({ user, params }) => {
    requirePermissionCheck(user, "promotions.manage");
    return promotionController.get(params);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "promotions.manage");
    const result = await promotionController.create(body);
    writeAuditLog({
      action: "promotion.create",
      actorId: user.id,
      targetId: result.data.promotion.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/promotions",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "promotions.manage");
    const result = await promotionController.update(params, body);
    writeAuditLog({
      action: "promotion.update",
      actorId: user.id,
      targetId: result.data.promotion.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/promotions/${result.data.promotion.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "promotions.manage");
    const result = await promotionController.remove(params);
    writeAuditLog({
      action: "promotion.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/promotions/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "promotions.manage");
    const result = await promotionController.restore(params);
    writeAuditLog({
      action: "promotion.restore",
      actorId: user.id,
      targetId: result.data.promotion.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/promotions/${result.data.promotion.id}/restore`,
    });
    return result;
  });
