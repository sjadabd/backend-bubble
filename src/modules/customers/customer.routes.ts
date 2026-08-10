import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { customerController } from "./customer.controller";

export const customerRoutes = new Elysia({ prefix: "/admin/customers" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "customers.manage");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return customerController.list(query);
  });
