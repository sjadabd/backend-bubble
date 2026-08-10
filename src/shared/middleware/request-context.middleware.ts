import { Elysia } from "elysia";
import { randomUUID } from "crypto";
import { logger } from "@config/logger";

/**
 * Attaches X-Request-ID and structured access log.
 */
export const requestContextPlugin = new Elysia({ name: "request-context" })
  .derive({ as: "global" }, ({ request }) => {
    const incoming = request.headers.get("x-request-id");
    const requestId = incoming?.trim() || randomUUID();
    return { requestId };
  })
  .onBeforeHandle(({ request, requestId, set }) => {
    set.headers["x-request-id"] = requestId;
    (request as Request & { __startedAt?: number }).__startedAt = Date.now();
  })
  .onAfterHandle(({ request, requestId, set }) => {
    set.headers["x-request-id"] = requestId;
    const started = (request as Request & { __startedAt?: number }).__startedAt;
    const duration = started ? Date.now() - started : undefined;
    const url = new URL(request.url);
    logger.info("request", {
      requestId,
      method: request.method,
      route: url.pathname,
      duration,
      ip: request.headers.get("x-forwarded-for"),
    });
  });
