import { resolve } from "path";
import { config } from "dotenv";
import { connectDatabase, disconnectDatabase } from "@database/connection";
import { bootstrapSuperAdmin, hasSuperAdmin } from "@modules/auth";

config({ path: resolve(import.meta.dir, "../../../.env") });

async function seed() {
  await connectDatabase();

  if (await hasSuperAdmin()) {
    console.log("السوبر أدمن موجود مسبقاً — تم تخطي البذر");
    await disconnectDatabase();
    return;
  }

  const name = process.env.SEED_SUPER_NAME ?? "سوبر أدمن";
  const email = process.env.SEED_SUPER_EMAIL ?? "admin@bubble.local";
  const password = process.env.SEED_SUPER_PASSWORD ?? "Admin123!";

  const user = await bootstrapSuperAdmin({ name, email, password });

  console.log("تم إنشاء السوبر أدمن:");
  console.log(`  البريد: ${user.email}`);
  console.log(`  كلمة المرور: ${password}`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
