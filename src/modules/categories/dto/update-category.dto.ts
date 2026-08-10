import { z } from "zod";
import { updateCategorySchema } from "../validators/category.validator";

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
