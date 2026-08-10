import { z } from "zod";
import { messages } from "@constants/messages";

export const createCategorySchema = z.object({
  title: z
    .string({ error: messages.categoryTitleRequired })
    .trim()
    .min(2, "عنوان القسم يجب أن يكون حرفين على الأقل")
    .max(120, "عنوان القسم طويل جداً"),
  logo: z
    .string({ error: messages.categoryLogoRequired })
    .trim()
    .min(1, messages.categoryLogoRequired)
    .max(2_500_000, "حجم الشعار كبير جداً"),
  description: z
    .string()
    .trim()
    .max(2000, "الوصف طويل جداً")
    .optional()
    .default(""),
  isActive: z.boolean({ error: "حالة التفعيل غير صالحة" }).optional().default(true),
});

export const updateCategorySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "عنوان القسم يجب أن يكون حرفين على الأقل")
      .max(120, "عنوان القسم طويل جداً")
      .optional(),
    logo: z
      .string()
      .trim()
      .min(1, messages.categoryLogoRequired)
      .max(2_500_000, "حجم الشعار كبير جداً")
      .optional(),
    description: z.string().trim().max(2000, "الوصف طويل جداً").optional(),
    isActive: z.boolean({ error: "حالة التفعيل غير صالحة" }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const categoryIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidCategoryId),
});
