import { Elysia } from "elysia";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import {
  jwtPlugin,
  authenticatePlugin,
  checkRateLimit,
  authRateLimits,
} from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { authController } from "../controllers";
import { assertBootstrapAllowed } from "../services/bootstrap-guard";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/status", () => authController.status())
  .post("/bootstrap", ({ body, request }) => {
    const limited = checkRateLimit(request, authRateLimits.bootstrap);
    if (!limited.allowed) {
      throw new AppError(messages.rateLimited, statusCodes.TOO_MANY_REQUESTS);
    }
    assertBootstrapAllowed(request);
    return authController.bootstrap(body);
  })
  .post("/login", async ({ body, jwt, request }) => {
    const limited = checkRateLimit(request, authRateLimits.login);
    if (!limited.allowed) {
      throw new AppError(messages.rateLimited, statusCodes.TOO_MANY_REQUESTS);
    }
    return authController.login(body, (payload) => jwt.sign(payload));
  })
  .use(
    new Elysia()
      .use(authenticatePlugin())
      .get("/me", ({ user }) => authController.me(user)),
  );
