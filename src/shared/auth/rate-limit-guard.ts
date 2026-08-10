import { Elysia } from "elysia";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { checkRateLimit, type RateLimitOptions } from "./rate-limit";

export function rateLimitGuard(options: RateLimitOptions) {
  return new Elysia({ name: `rate-limit-${options.name}` }).onBeforeHandle(
    ({ request }) => {
      const result = checkRateLimit(request, options);
      if (!result.allowed) {
        throw new AppError(messages.rateLimited, statusCodes.TOO_MANY_REQUESTS);
      }
    },
  );
}

/** Presets for sensitive auth routes */
export const authRateLimits = {
  login: { name: "auth-login", limit: 10, windowMs: 60_000 },
  bootstrap: { name: "auth-bootstrap", limit: 5, windowMs: 60_000 },
  refresh: { name: "auth-refresh", limit: 30, windowMs: 60_000 },
  forgotPassword: { name: "auth-forgot", limit: 5, windowMs: 60_000 },
  otp: { name: "auth-otp", limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;
