import { z } from "zod";
import { updateUserSchema } from "../validators/user.validator";

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
