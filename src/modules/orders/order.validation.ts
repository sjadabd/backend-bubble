import { z } from "zod";
import { messages } from "@constants/messages";
import { ORDER_STATUSES } from "./order.model";

export const orderIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidOrderId),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "updatedAt", "total", "status", "customerName"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z
    .union([z.enum(ORDER_STATUSES), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  cancelRequest: z
    .enum(["pending", ""])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const updateOrderSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    statusNote: z.string().trim().max(500).optional(),
    adminNotes: z.string().trim().max(1000).optional(),
    customerAddress: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  })
  .refine(
    (data) => {
      if (data.status !== "cancelled") return true;
      return (data.statusNote?.trim().length ?? 0) >= 3;
    },
    { message: messages.orderCancelReasonRequired, path: ["statusNote"] },
  );

export const reviewCancelRequestSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reviewNote: z.string().trim().max(500).optional().default(""),
  })
  .refine(
    (data) => {
      if (data.decision !== "approve") return true;
      return data.reviewNote.trim().length >= 3;
    },
    { message: messages.orderCancelReasonRequired, path: ["reviewNote"] },
  );

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ReviewCancelRequestInput = z.infer<
  typeof reviewCancelRequestSchema
>;
