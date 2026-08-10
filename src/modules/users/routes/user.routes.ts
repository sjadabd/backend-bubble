import { Elysia } from "elysia";
import {
  authenticatePlugin,
  requirePermissionCheck,
  requireSuperAdminCheck,
} from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { userController } from "../controllers";
import { writeAuditLog } from "@shared/audit";

export const userRoutes = new Elysia({ prefix: "/admin/users" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "users.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return userController.list(query);
  })
  .post("/", async ({ user, body, request }) => {
    requireSuperAdminCheck(user);
    const result = await userController.create(body, user);
    writeAuditLog({
      action: "user.create",
      actorId: user.id,
      targetId: result.data.user.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/users",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requireSuperAdminCheck(user);
    const result = await userController.update(params, body);
    writeAuditLog({
      action: "user.update",
      actorId: user.id,
      targetId: result.data.user.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/users/${String((params as { id?: string }).id ?? "")}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requireSuperAdminCheck(user);
    const result = await userController.remove(params, user);
    writeAuditLog({
      action: "user.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/users/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requireSuperAdminCheck(user);
    const result = await userController.restore(params);
    writeAuditLog({
      action: "user.restore",
      actorId: user.id,
      targetId: result.data.user.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/users/${result.data.user.id}/restore`,
    });
    return result;
  });
