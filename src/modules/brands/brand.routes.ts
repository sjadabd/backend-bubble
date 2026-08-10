import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { brandController } from "./brand.controller";

export const brandRoutes = new Elysia({ prefix: "/admin/brands" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "products.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return brandController.list(query);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await brandController.create(body);
    writeAuditLog({
      action: "brand.create",
      actorId: user.id,
      targetId: result.data.brand.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/brands",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await brandController.update(params, body);
    writeAuditLog({
      action: "brand.update",
      actorId: user.id,
      targetId: result.data.brand.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/brands/${result.data.brand.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await brandController.remove(params);
    writeAuditLog({
      action: "brand.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/brands/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await brandController.restore(params);
    writeAuditLog({
      action: "brand.restore",
      actorId: user.id,
      targetId: result.data.brand.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/brands/${result.data.brand.id}/restore`,
    });
    return result;
  });
