import { z } from "zod";
import { messages } from "@constants/messages";

export const createTagSchema = z.object({
  name: z
    .string({ error: messages.tagNameRequired })
    .trim()
    .min(1, messages.tagNameRequired)
    .max(80, "اسم الوسم طويل جداً"),
  color: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .optional()
    .default("#0084E4"),
});

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().min(1).max(32).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const tagIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidTagId),
});

export const listTagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "deleted"]).default("active"),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
