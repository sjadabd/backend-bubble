import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { dashboardController } from "./dashboard.controller";

export const dashboardRoutes = new Elysia({ prefix: "/admin/reports" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/overview", async ({ user, request }) => {
    requirePermissionCheck(user, "reports.view");
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return dashboardController.overview(query);
  });
