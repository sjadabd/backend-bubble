import { z } from "zod";
import { WEBSITE_PAGES } from "@modules/website/website.model";

export const storeWebsiteQuerySchema = z.object({
  page: z.enum(WEBSITE_PAGES).default("homepage"),
});

/** Shared simple list (promotions, etc.) */
export const storeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const optionalObjectId = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || !/^[a-f\d]{24}$/i.test(value)) return undefined;
    return value;
  });

const optionalBool = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0", ""])])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  });

const optionalNonNeg = z
  .union([z.coerce.number(), z.literal("")])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "" || Number.isNaN(value)) {
      return undefined;
    }
    const n = Number(value);
    return n >= 0 ? n : undefined;
  });

export const storeProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().optional().default(""),
  search: z.string().trim().optional().default(""),
  categoryId: optionalObjectId,
  minPrice: optionalNonNeg,
  maxPrice: optionalNonNeg,
  onSale: optionalBool,
  featured: optionalBool,
  sort: z
    .enum(["newest", "price_asc", "price_desc", "popular"])
    .optional()
    .default("newest"),
});

export const storeProductIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "معرّف المنتج غير صالح"),
});

export const storePromotionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(24),
  type: z
    .enum(["bundle", "product_discount", "coupon", "free_shipping", ""])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const storePromotionIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "معرّف العرض غير صالح"),
});

export const storePromotionCodeQuerySchema = z.object({
  code: z.string().trim().min(1).max(40),
});

const storeOrderLineSchema = z.object({
  kind: z.enum(["product", "bundle"]).default("product"),
  productId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  promotionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(1).max(300),
  image: z.string().nullable().optional(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99).default(1),
  productIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
});

export const createStoreOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(30),
  customerAddress: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  lines: z.array(storeOrderLineSchema).min(1),
  couponCode: z.string().trim().max(40).optional(),
  promotionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  freeShippingPromotionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  freeShipping: z.boolean().optional().default(false),
});

export const storeOrderIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "معرّف الطلب غير صالح"),
});

export const requestCancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "اكتب سبب الإلغاء").max(500),
});

export type StoreWebsiteQuery = z.infer<typeof storeWebsiteQuerySchema>;
export type StoreListQuery = z.infer<typeof storeListQuerySchema>;
export type StoreProductsQuery = z.infer<typeof storeProductsQuerySchema>;
export type StorePromotionsQuery = z.infer<typeof storePromotionsQuerySchema>;
export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>;
