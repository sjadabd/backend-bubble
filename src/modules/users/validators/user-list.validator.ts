import { z } from "zod";

export const listUsersQuerySchema = z.object({
  page: z.coerce
    .number({ error: "رقم الصفحة غير صالح" })
    .int("رقم الصفحة يجب أن يكون عدداً صحيحاً")
    .min(1, "رقم الصفحة يجب أن يكون 1 على الأقل")
    .default(1),
  limit: z.coerce
    .number({ error: "حد العناصر غير صالح" })
    .int("حد العناصر يجب أن يكون عدداً صحيحاً")
    .min(1, "حد العناصر يجب أن يكون 1 على الأقل")
    .max(100, "حد العناصر لا يتجاوز 100")
    .default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum(["createdAt", "name", "email", "role", "isActive", "updatedAt"], {
      error: "حقل الترتيب غير صالح",
    })
    .default("createdAt"),
  sortOrder: z
    .enum(["asc", "desc"], { error: "اتجاه الترتيب غير صالح" })
    .default("desc"),
  status: z
    .enum(["active", "inactive", "deleted"], {
      error: "حالة التصفية غير صالحة",
    })
    .default("active"),
});
