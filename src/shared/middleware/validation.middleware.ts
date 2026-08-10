import { ZodError, type ZodType } from "zod";
import { messages } from "@constants/messages";
import { ValidationError } from "@shared/errors";

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(messages.validationFailed, error.flatten());
    }
    throw error;
  }
}
