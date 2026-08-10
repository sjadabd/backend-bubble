import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  listPromotions,
  restorePromotion,
  updatePromotion,
} from "./promotion.service";
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  promotionIdParamSchema,
  updatePromotionSchema,
} from "./promotion.validation";

export const promotionController = {
  list: async (query: unknown) => {
    const input = parseBody(listPromotionsQuerySchema, query);
    return { success: true, data: await listPromotions(input) };
  },

  get: async (params: unknown) => {
    const { id } = parseBody(promotionIdParamSchema, params);
    const promotion = await getPromotion(id);
    return { success: true, data: { promotion } };
  },

  create: async (body: unknown) => {
    const input = parseBody(createPromotionSchema, body);
    const promotion = await createPromotion(input);
    return {
      success: true,
      message: messages.promotionCreated,
      data: { promotion },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(promotionIdParamSchema, params);
    const input = parseBody(updatePromotionSchema, body);
    const promotion = await updatePromotion(id, input);
    return {
      success: true,
      message: messages.promotionUpdated,
      data: { promotion },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(promotionIdParamSchema, params);
    return {
      success: true,
      message: messages.promotionDeleted,
      data: await deletePromotion(id),
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(promotionIdParamSchema, params);
    const promotion = await restorePromotion(id);
    return {
      success: true,
      message: messages.promotionRestored,
      data: { promotion },
    };
  },
};
