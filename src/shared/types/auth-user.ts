/** Auth identity shape for shared middleware (no feature-module imports). */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  permissions: string[];
  isActive: boolean;
  deletedAt: string | null;
  password: string | null;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
