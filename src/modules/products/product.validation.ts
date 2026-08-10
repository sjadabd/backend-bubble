import { z } from "zod";
import { messages } from "@constants/messages";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, messages.invalidProductId);

const galleryItemSchema = z.object({
  url: z.string().trim().min(1).max(2_500_000),
  sortOrder: z.number().int().optional().default(0),
});

const seoSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
});

const packageSchema = z.object({
  weight: z.number().nonnegative().nullable().optional(),
  unit: z.string().trim().max(40).optional().default(""),
  carton: z.string().trim().max(80).optional().default(""),
});

const variantAttributeSchema = z.object({
  attributeId: z.string().regex(/^[a-f\d]{24}$/i),
  valueId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const variantBodySchema = z.object({
  sku: z
    .string({ error: messages.variantSkuRequired })
    .trim()
    .min(1, messages.variantSkuRequired)
    .max(80),
  barcode: z.string().trim().max(80).optional().default(""),
  image: z.string().trim().max(2_500_000).optional().default(""),
  attributes: z.array(variantAttributeSchema).optional().default([]),
  price: z.number({ error: "السعر مطلوب" }).nonnegative(),
  oldPrice: z.number().nonnegative().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().optional().default(0),
  reserved: z.number().int().nonnegative().optional().default(0),
  package: packageSchema.optional().default({ unit: "", carton: "" }),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const updateVariantBodySchema = z
  .object({
    sku: z.string().trim().min(1).max(80).optional(),
    barcode: z.string().trim().max(80).optional(),
    image: z.string().trim().max(2_500_000).optional(),
    attributes: z.array(variantAttributeSchema).optional(),
    price: z.number().nonnegative().optional(),
    oldPrice: z.number().nonnegative().nullable().optional(),
    cost: z.number().nonnegative().nullable().optional(),
    stock: z.number().int().nonnegative().optional(),
    reserved: z.number().int().nonnegative().optional(),
    package: packageSchema.optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const createProductSchema = z.object({
  title: z
    .string({ error: messages.productTitleRequired })
    .trim()
    .min(2)
    .max(200),
  titleEn: z.string().trim().max(200).optional().default(""),
  slug: z.string().trim().max(220).optional(),
  description: z.string().trim().max(5000).optional().default(""),
  brandId: z
    .string({ error: messages.productBrandRequired })
    .regex(/^[a-f\d]{24}$/i, messages.productBrandRequired),
  categoryIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .optional()
    .default([]),
  tags: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .optional()
    .default([]),
  gallery: z.array(galleryItemSchema).optional().default([]),
  features: z.array(z.string().trim().min(1).max(300)).optional().default([]),
  seo: seoSchema.optional().default({ title: "", description: "" }),
  variants: z.array(variantBodySchema).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    titleEn: z.string().trim().max(200).optional(),
    slug: z.string().trim().min(1).max(220).optional(),
    description: z.string().trim().max(5000).optional(),
    brandId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    categoryIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
    tags: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
    gallery: z.array(galleryItemSchema).optional(),
    features: z.array(z.string().trim().min(1).max(300)).optional(),
    seo: seoSchema.optional(),
    featured: z.boolean().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const productIdParamSchema = z.object({
  id: objectId,
});

export const productVariantParamSchema = z.object({
  id: objectId,
  variantId: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidVariantId),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "title", "status", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "inactive", "deleted"]).default("active"),
  brandId: z
    .union([
      z.string().regex(/^[a-f\d]{24}$/i),
      z.literal(""),
    ])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type VariantBodyInput = z.infer<typeof variantBodySchema>;
export type UpdateVariantBodyInput = z.infer<typeof updateVariantBodySchema>;
