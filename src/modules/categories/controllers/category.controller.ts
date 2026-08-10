import {
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
} from "../services";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "../validators";
import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import type { AuthUser } from "@shared/types";

export const categoryController = {
  list: async (query: unknown) => {
    const input = parseBody(listCategoriesQuerySchema, query);
    const result = await listCategories(input);
    return {
      success: true,
      data: result,
    };
  },

  create: async (body: unknown, currentUser: AuthUser) => {
    const input = parseBody(createCategorySchema, body);
    const category = await createCategory(input, currentUser.id);
    return {
      success: true,
      message: messages.categoryCreated,
      data: { category },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(categoryIdParamSchema, params);
    const input = parseBody(updateCategorySchema, body);
    const category = await updateCategory(id, input);
    return {
      success: true,
      message: messages.categoryUpdated,
      data: { category },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(categoryIdParamSchema, params);
    const result = await deleteCategory(id);
    return {
      success: true,
      message: messages.categoryDeleted,
      data: result,
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(categoryIdParamSchema, params);
    const category = await restoreCategory(id);
    return {
      success: true,
      message: messages.categoryRestored,
      data: { category },
    };
  },
};
