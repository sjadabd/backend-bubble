import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  getOrderById,
  getPendingCancelAlerts,
  listOrders,
  reviewCancelRequest,
  updateOrder,
} from "./order.service";
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  reviewCancelRequestSchema,
  updateOrderSchema,
} from "./order.validation";

export const orderController = {
  list: async (query: unknown) => {
    const input = parseBody(listOrdersQuerySchema, query);
    return { success: true, data: await listOrders(input) };
  },

  cancelAlerts: async () => {
    return { success: true, data: await getPendingCancelAlerts() };
  },

  getById: async (params: unknown) => {
    const { id } = parseBody(orderIdParamSchema, params);
    return {
      success: true,
      data: { order: await getOrderById(id) },
    };
  },

  update: async (
    params: unknown,
    body: unknown,
    actorId?: string | null,
  ) => {
    const { id } = parseBody(orderIdParamSchema, params);
    const input = parseBody(updateOrderSchema, body);
    const order = await updateOrder(id, input, actorId);
    return {
      success: true,
      message: messages.orderUpdated,
      data: { order },
    };
  },

  reviewCancel: async (
    params: unknown,
    body: unknown,
    actorId?: string | null,
  ) => {
    const { id } = parseBody(orderIdParamSchema, params);
    const input = parseBody(reviewCancelRequestSchema, body);
    const order = await reviewCancelRequest(id, input, actorId);
    return {
      success: true,
      message:
        input.decision === "approve"
          ? "تم تأكيد إلغاء الطلب"
          : "تم رفض طلب الإلغاء",
      data: { order },
    };
  },
};
