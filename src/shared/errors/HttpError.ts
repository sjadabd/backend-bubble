import { AppError } from "./AppError";

/** HTTP-oriented application error — same runtime shape as AppError. */
export class HttpError extends AppError {
  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message, statusCode, details);
    this.name = "HttpError";
  }
}
