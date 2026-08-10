import { z } from "zod";
import { bootstrapSchema } from "../validators/auth.validator";

export type BootstrapDto = z.infer<typeof bootstrapSchema>;
