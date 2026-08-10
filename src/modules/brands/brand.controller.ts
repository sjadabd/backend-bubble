import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  createBrand,
  deleteBrand,
  listBrands,
  restoreBrand,
  updateBrand,
} from "./brand.service";
import {
  brandIdParamSchema,
  createBrandSchema,
  listBrandsQuerySchema,
  updateBrandSchema,
} from "./brand.validation";

export const brandController = {
  list: async (query: unknown) => {
    const input = parseBody(listBrandsQuerySchema, query);
    return { success: true, data: await listBrands(input) };
  },

  create: async (body: unknown) => {
    const input = parseBody(createBrandSchema, body);
    const brand = await createBrand(input);
    return {
      success: true,
      message: messages.brandCreated,
      data: { brand },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(brandIdParamSchema, params);
    const input = parseBody(updateBrandSchema, body);
    const brand = await updateBrand(id, input);
    return {
      success: true,
      message: messages.brandUpdated,
      data: { brand },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(brandIdParamSchema, params);
    const result = await deleteBrand(id);
    return {
      success: true,
      message: messages.brandDeleted,
      data: result,
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(brandIdParamSchema, params);
    const brand = await restoreBrand(id);
    return {
      success: true,
      message: messages.brandRestored,
      data: { brand },
    };
  },
};
