export const USER_ROLES = ["super_admin", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
