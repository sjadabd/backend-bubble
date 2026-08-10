import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { orderController } from "./order.controller";

export const orderRoutes = new Elysia({ prefix: "/admin/orders" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "orders.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return orderController.list(query);
  })
  .get("/cancel-alerts", async ({ user }) => {
    requirePermissionCheck(user, "orders.manage");
    return orderController.cancelAlerts();
  })
  .get("/:id", async ({ user, params }) => {
    requirePermissionCheck(user, "orders.manage");
    return orderController.getById(params);
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "orders.manage");
    const result = await orderController.update(params, body, user.id);
    writeAuditLog({
      action: "order.update",
      actorId: user.id,
      targetId: result.data.order.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/orders/${result.data.order.id}`,
      meta: {
        status: result.data.order.status,
      },
    });
    return result;
  })
  .post("/:id/cancel-review", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "orders.manage");
    const result = await orderController.reviewCancel(params, body, user.id);
    writeAuditLog({
      action: "order.update",
      actorId: user.id,
      targetId: result.data.order.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/orders/${result.data.order.id}/cancel-review`,
      meta: {
        status: result.data.order.status,
        cancelRequest: result.data.order.cancelRequest?.status,
      },
    });
    return result;
  });
