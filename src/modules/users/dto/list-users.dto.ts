import { z } from "zod";
import { listUsersQuerySchema } from "../validators/user-list.validator";

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
