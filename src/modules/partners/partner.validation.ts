import { z } from "zod";
import { messages } from "@constants/messages";

export const createPartnerSchema = z.object({
  name: z
    .string({ error: messages.partnerNameRequired })
    .trim()
    .min(1, messages.partnerNameRequired)
    .max(120, "اسم الشريك طويل جداً"),
  logo: z
    .string({ error: messages.partnerLogoRequired })
    .trim()
    .min(1, messages.partnerLogoRequired)
    .max(2_500_000, "حجم الشعار كبير جداً"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  sortOrder: z.number().int().optional().default(0),
});

export const updatePartnerSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    logo: z.string().trim().min(1).max(2_500_000).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const partnerIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidPartnerId),
});

export const listPartnersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "name", "sortOrder", "status", "updatedAt"])
    .default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["active", "inactive", "deleted"]).default("active"),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;
