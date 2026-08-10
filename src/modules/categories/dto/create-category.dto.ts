import { z } from "zod";
import { createCategorySchema } from "../validators/category.validator";

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
