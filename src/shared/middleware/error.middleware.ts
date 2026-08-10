import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { logger } from "@config/logger";

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    error instanceof Error === false
  ) {
    const maybe = error as { message?: string; statusCode?: number; details?: unknown };
    if (typeof maybe.message === "string" && maybe.statusCode) {
      return {
        status: maybe.statusCode,
        body: {
          success: false,
          message: maybe.message,
          details: maybe.details,
        },
      };
    }
  }

  logger.error("unhandled_error", {
    error: error instanceof Error ? error.message : String(error),
  });

  return {
    status: statusCodes.INTERNAL_ERROR,
    body: {
      success: false,
      message: messages.internalError,
    },
  };
}

export function applyErrorHandler() {
  return {
    onError({ error, set }: { error: unknown; set: { status?: number | string } }) {
      const result = toErrorResponse(error);
      set.status = result.status;
      return result.body;
    },
  };
}
