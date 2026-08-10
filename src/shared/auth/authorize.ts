import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import type { UserRole } from "@constants/roles";
import { AppError } from "@shared/errors";
import type { AuthUser } from "@shared/types";
import type { Permission } from "@constants/permissions";

export function hasPermission(user: AuthUser, permission: Permission) {
  if (user.role === "super_admin") return true;
  return user.permissions.includes(permission);
}

export function isSuperAdmin(user: AuthUser) {
  return user.role === "super_admin";
}

/** authorize — assert authenticated user exists on context */
export function authorize(user: AuthUser | null | undefined): asserts user is AuthUser {
  if (!user) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }
}

export function requirePermissionCheck(user: AuthUser, permission: Permission) {
  authorize(user);
  if (!hasPermission(user, permission)) {
    throw new AppError(messages.forbidden, statusCodes.FORBIDDEN);
  }
}

export function requireRoleCheck(user: AuthUser, role: UserRole) {
  authorize(user);
  if (role === "super_admin") {
    if (user.role !== "super_admin") {
      throw new AppError(messages.superAdminOnly, statusCodes.FORBIDDEN);
    }
    return;
  }
  if (user.role !== role && user.role !== "super_admin") {
    throw new AppError(messages.forbidden, statusCodes.FORBIDDEN);
  }
}

export function requireSuperAdminCheck(user: AuthUser) {
  authorize(user);
  if (!isSuperAdmin(user)) {
    throw new AppError(messages.superAdminOnly, statusCodes.FORBIDDEN);
  }
}
