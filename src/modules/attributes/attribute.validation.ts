import { z } from "zod";
import { messages } from "@constants/messages";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createAttributeSchema = z.object({
  name: z
    .string({ error: messages.attributeNameRequired })
    .trim()
    .min(1, messages.attributeNameRequired)
    .max(80),
  values: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        sortOrder: z.number().int().optional().default(0),
      }),
    )
    .optional()
    .default([]),
});

export const updateAttributeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const attributeValueSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional().default(0),
});

export const updateAttributeValueSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const attributeIdParamSchema = z.object({
  id: objectId.refine(Boolean, { message: messages.invalidAttributeId }),
});

export const attributeValueParamSchema = z.object({
  id: objectId,
  valueId: objectId,
});

export const listAttributesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "deleted"]).default("active"),
});

export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;
export type ListAttributesQuery = z.infer<typeof listAttributesQuerySchema>;
export type AttributeValueInput = z.infer<typeof attributeValueSchema>;
export type UpdateAttributeValueInput = z.infer<
  typeof updateAttributeValueSchema
>;
