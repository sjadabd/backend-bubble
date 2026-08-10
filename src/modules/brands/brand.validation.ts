import { z } from "zod";
import { messages } from "@constants/messages";

export const createBrandSchema = z.object({
  name: z
    .string({ error: messages.brandNameRequired })
    .trim()
    .min(1, messages.brandNameRequired)
    .max(120, "اسم العلامة طويل جداً"),
  logo: z
    .string({ error: messages.brandLogoRequired })
    .trim()
    .min(1, messages.brandLogoRequired)
    .max(2_500_000, "حجم الشعار كبير جداً"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  sortOrder: z.number().int().optional().default(0),
});

export const updateBrandSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    logo: z.string().trim().min(1).max(2_500_000).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const brandIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidBrandId),
});

export const listBrandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "name", "sortOrder", "status", "updatedAt"])
    .default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["active", "inactive", "deleted"]).default("active"),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
