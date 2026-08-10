import { z } from "zod";
import { PERMISSIONS } from "@constants/permissions";
import { messages } from "@constants/messages";

const name = z
  .string({ error: "الاسم مطلوب" })
  .trim()
  .min(2, "الاسم يجب أن يكون حرفين على الأقل")
  .max(100, "الاسم طويل جداً");

const email = z
  .string({ error: "البريد الإلكتروني مطلوب" })
  .trim()
  .email("البريد الإلكتروني غير صالح")
  .toLowerCase();

const password = z
  .string({ error: "كلمة المرور مطلوبة" })
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .max(128, "كلمة المرور طويلة جداً");

export const createUserSchema = z.object({
  name,
  email,
  password,
  permissions: z
    .array(z.enum(PERMISSIONS, { error: "صلاحية غير صالحة" }), {
      error: "قائمة الصلاحيات غير صالحة",
    })
    .default([]),
  isActive: z.boolean({ error: "حالة التفعيل غير صالحة" }).optional().default(true),
});

export const updateUserSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    password: password.optional(),
    permissions: z
      .array(z.enum(PERMISSIONS, { error: "صلاحية غير صالحة" }))
      .optional(),
    isActive: z.boolean({ error: "حالة التفعيل غير صالحة" }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, messages.invalidUserId),
});
