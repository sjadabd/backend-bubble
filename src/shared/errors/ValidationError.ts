import { AppError } from "./AppError";

/** Validation failure — response body shape unchanged (message + details). */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}
