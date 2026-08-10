import { z } from "zod";
import { listCategoriesQuerySchema } from "../validators/category-list.validator";

export type ListCategoriesQueryDto = z.infer<typeof listCategoriesQuerySchema>;
