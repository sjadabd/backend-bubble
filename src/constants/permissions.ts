export const PERMISSIONS = [
  "users.manage",
  "customers.manage",
  "categories.manage",
  "products.manage",
  "promotions.manage",
  "website.manage",
  "orders.manage",
  "reports.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "users.manage": "إدارة المستخدمين",
  "customers.manage": "إدارة الزبائن",
  "categories.manage": "إدارة الأقسام",
  "products.manage": "إدارة المنتجات",
  "promotions.manage": "إدارة العروض",
  "website.manage": "إدارة الموقع",
  "orders.manage": "إدارة الطلبات",
  "reports.view": "عرض التقارير",
  "settings.manage": "إدارة الإعدادات",
};
