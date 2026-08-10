import { z } from "zod";
import { loginSchema } from "../validators/auth.validator";

export type LoginDto = z.infer<typeof loginSchema>;
