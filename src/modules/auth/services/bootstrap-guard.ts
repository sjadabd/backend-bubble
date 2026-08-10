import { env } from "@config/env";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";

/** Protects POST /auth/bootstrap */
export function assertBootstrapAllowed(request: Request) {
  if (!env.bootstrapEnabled) {
    throw new AppError(messages.bootstrapDisabled, statusCodes.FORBIDDEN);
  }

  if (!env.adminBootstrapKey) {
    throw new AppError(messages.bootstrapDisabled, statusCodes.FORBIDDEN);
  }

  const key = request.headers.get("x-bootstrap-key")?.trim();
  if (!key) {
    throw new AppError(messages.bootstrapKeyRequired, statusCodes.UNAUTHORIZED);
  }

  if (key !== env.adminBootstrapKey) {
    throw new AppError(messages.bootstrapKeyInvalid, statusCodes.FORBIDDEN);
  }
}
