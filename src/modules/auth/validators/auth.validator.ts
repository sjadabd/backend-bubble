import { z } from "zod";

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

export const bootstrapSchema = z.object({
  name,
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "كلمة المرور مطلوبة" })
    .min(1, "كلمة المرور مطلوبة")
    .max(128, "كلمة المرور طويلة جداً"),
});
