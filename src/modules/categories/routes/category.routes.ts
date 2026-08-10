import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { categoryController } from "../controllers";

export const categoryRoutes = new Elysia({ prefix: "/admin/categories" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "categories.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return categoryController.list(query);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "categories.manage");
    const result = await categoryController.create(body, user);
    writeAuditLog({
      action: "category.create",
      actorId: user.id,
      targetId: result.data.category.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/categories",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "categories.manage");
    const result = await categoryController.update(params, body);
    writeAuditLog({
      action: "category.update",
      actorId: user.id,
      targetId: result.data.category.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/categories/${result.data.category.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "categories.manage");
    const result = await categoryController.remove(params);
    writeAuditLog({
      action: "category.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/categories/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "categories.manage");
    const result = await categoryController.restore(params);
    writeAuditLog({
      action: "category.restore",
      actorId: user.id,
      targetId: result.data.category.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/categories/${result.data.category.id}/restore`,
    });
    return result;
  });
