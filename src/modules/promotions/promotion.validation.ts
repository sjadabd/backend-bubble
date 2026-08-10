import { z } from "zod";
import { messages } from "@constants/messages";
import { PROMOTION_TYPES } from "./promotion.model";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, messages.invalidPromotionId);

const dateInput = z.coerce.date({ error: messages.promotionDatesInvalid });

const bundleDataSchema = z.object({
  productIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, messages.invalidProductId))
    .min(2, messages.promotionBundleProductsMin),
  originalPrice: z.number().nonnegative().nullable().optional(),
  offerPrice: z.number({ error: messages.promotionOfferPriceRequired }).nonnegative(),
});

const productIdString = z
  .string()
  .regex(/^[a-f\d]{24}$/i, messages.invalidProductId);

/** Accepts productIds[]; legacy single productId is normalized. */
const productDiscountDataSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const data = raw as Record<string, unknown>;
    const fromIds = Array.isArray(data.productIds)
      ? data.productIds.filter((id): id is string => typeof id === "string")
      : [];
    const legacy =
      typeof data.productId === "string" && data.productId.trim()
        ? [data.productId.trim()]
        : [];
    const productIds = [...new Set(fromIds.length ? fromIds : legacy)];
    return {
      discountType: data.discountType,
      value: data.value,
      productIds,
    };
  },
  z
    .object({
      productIds: z
        .array(productIdString)
        .min(1, messages.promotionProductRequired),
      discountType: z.enum(["percent", "fixed_price"]),
      value: z
        .number({ error: messages.promotionDiscountValueRequired })
        .nonnegative(),
    })
    .superRefine((data, ctx) => {
      if (data.discountType === "percent" && data.value > 100) {
        ctx.addIssue({
          code: "custom",
          message: messages.promotionPercentInvalid,
          path: ["value"],
        });
      }
    }),
);

const couponDataSchema = z
  .object({
    code: z
      .string({ error: messages.promotionCouponCodeRequired })
      .trim()
      .min(2)
      .max(40)
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(["percent", "fixed"]),
    value: z.number({ error: messages.promotionDiscountValueRequired }).nonnegative(),
    minOrderAmount: z.number().nonnegative().optional().default(0),
    usageLimit: z.number().int().positive().nullable().optional().default(null),
    perUserLimit: z.number().int().positive().nullable().optional().default(null),
    usedCount: z.number().int().nonnegative().optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percent" && data.value > 100) {
      ctx.addIssue({
        code: "custom",
        message: messages.promotionPercentInvalid,
        path: ["value"],
      });
    }
  });

const freeShippingDataSchema = z.object({
  minOrderAmount: z
    .number({ error: messages.promotionMinOrderRequired })
    .nonnegative(),
  /** إجمالي مرات الاستخدام لكل العملاء (فارغ = بلا حد) */
  usageLimit: z.number().int().positive().nullable().optional().default(null),
  /** مرات الاستخدام لكل مستخدم (1، 2، … أو فارغ بلا حد) */
  perUserLimit: z.number().int().positive().nullable().optional().default(null),
  usedCount: z.number().int().nonnegative().optional().default(0),
});

export {
  bundleDataSchema,
  productDiscountDataSchema,
  couponDataSchema,
  freeShippingDataSchema,
};

const promotionDataByType = {
  bundle: bundleDataSchema,
  product_discount: productDiscountDataSchema,
  coupon: couponDataSchema,
  free_shipping: freeShippingDataSchema,
} as const;

export const createPromotionSchema = z
  .object({
    title: z
      .string({ error: messages.promotionTitleRequired })
      .trim()
      .min(2)
      .max(200),
    type: z.enum(PROMOTION_TYPES, { error: messages.promotionTypeRequired }),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    image: z.string().trim().max(2_500_000).optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    startAt: dateInput,
    endAt: dateInput,
    priority: z.number().int().optional().default(0),
    data: z.record(z.string(), z.unknown()),
  })
  .superRefine((input, ctx) => {
    if (input.startAt >= input.endAt) {
      ctx.addIssue({
        code: "custom",
        message: messages.promotionDatesInvalid,
        path: ["endAt"],
      });
    }

    const schema = promotionDataByType[input.type];
    const parsed = schema.safeParse(input.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["data", ...issue.path],
        });
      }
    }
  });

export const updatePromotionSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    image: z.string().trim().max(2_500_000).optional(),
    description: z.string().trim().max(5000).optional(),
    startAt: dateInput.optional(),
    endAt: dateInput.optional(),
    priority: z.number().int().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const promotionIdParamSchema = z.object({
  id: objectId,
});

export const listPromotionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "title", "status", "startAt", "endAt", "priority", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "inactive", "deleted"]).default("active"),
  type: z
    .union([z.enum(PROMOTION_TYPES), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
