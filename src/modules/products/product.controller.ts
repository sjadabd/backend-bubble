import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  addVariant,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  removeVariant,
  restoreProduct,
  updateProduct,
  updateVariant,
} from "./product.service";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productVariantParamSchema,
  updateProductSchema,
  updateVariantBodySchema,
  variantBodySchema,
} from "./product.validation";

export const productController = {
  list: async (query: unknown) => {
    const input = parseBody(listProductsQuerySchema, query);
    return { success: true, data: await listProducts(input) };
  },

  get: async (params: unknown) => {
    const { id } = parseBody(productIdParamSchema, params);
    const product = await getProduct(id);
    return { success: true, data: { product } };
  },

  create: async (body: unknown) => {
    const input = parseBody(createProductSchema, body);
    const product = await createProduct(input);
    return {
      success: true,
      message: messages.productCreated,
      data: { product },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(productIdParamSchema, params);
    const input = parseBody(updateProductSchema, body);
    const product = await updateProduct(id, input);
    return {
      success: true,
      message: messages.productUpdated,
      data: { product },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(productIdParamSchema, params);
    return {
      success: true,
      message: messages.productDeleted,
      data: await deleteProduct(id),
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(productIdParamSchema, params);
    const product = await restoreProduct(id);
    return {
      success: true,
      message: messages.productRestored,
      data: { product },
    };
  },

  addVariant: async (params: unknown, body: unknown) => {
    const { id } = parseBody(productIdParamSchema, params);
    const input = parseBody(variantBodySchema, body);
    const variant = await addVariant(id, input);
    return {
      success: true,
      message: messages.variantCreated,
      data: { variant },
    };
  },

  updateVariant: async (params: unknown, body: unknown) => {
    const { id, variantId } = parseBody(productVariantParamSchema, params);
    const input = parseBody(updateVariantBodySchema, body);
    const variant = await updateVariant(id, variantId, input);
    return {
      success: true,
      message: messages.variantUpdated,
      data: { variant },
    };
  },

  removeVariant: async (params: unknown) => {
    const { id, variantId } = parseBody(productVariantParamSchema, params);
    return {
      success: true,
      message: messages.variantDeleted,
      data: await removeVariant(id, variantId),
    };
  },
};
