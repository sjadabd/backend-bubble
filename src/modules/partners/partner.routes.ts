import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { partnerController } from "./partner.controller";

export const partnerRoutes = new Elysia({ prefix: "/admin/partners" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "website.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return partnerController.list(query);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await partnerController.create(body);
    writeAuditLog({
      action: "partner.create",
      actorId: user.id,
      targetId: result.data.partner.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/partners",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await partnerController.update(params, body);
    writeAuditLog({
      action: "partner.update",
      actorId: user.id,
      targetId: result.data.partner.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/partners/${result.data.partner.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await partnerController.remove(params);
    writeAuditLog({
      action: "partner.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/partners/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "website.manage");
    const result = await partnerController.restore(params);
    writeAuditLog({
      action: "partner.restore",
      actorId: user.id,
      targetId: result.data.partner.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/partners/${result.data.partner.id}/restore`,
    });
    return result;
  });
