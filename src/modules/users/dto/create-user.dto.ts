import { z } from "zod";
import { createUserSchema } from "../validators/user.validator";

export type CreateUserDto = z.infer<typeof createUserSchema>;
