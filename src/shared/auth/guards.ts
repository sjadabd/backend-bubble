import { Elysia } from "elysia";
import type { Permission } from "@constants/permissions";
import type { UserRole } from "@constants/roles";
import { jwtPlugin } from "./jwt";
import { authenticate } from "./authenticate";
import {
  requirePermissionCheck,
  requireRoleCheck,
  requireSuperAdminCheck,
} from "./authorize";

/**
 * Pipeline: jwt → authenticate (loadUser) → ctx.user
 */
export function authenticatePlugin() {
  return new Elysia({ name: "authenticate-plugin" })
    .use(jwtPlugin)
    .derive({ as: "scoped" }, async ({ jwt, request }) => ({
      user: await authenticate(jwt, request),
    }));
}

/** authenticate → requirePermission */
export function requirePermission(permission: Permission) {
  return new Elysia({ name: `require-permission-${permission}` })
    .use(authenticatePlugin())
    .onBeforeHandle(({ user }) => {
      requirePermissionCheck(user, permission);
    });
}

/** authenticate → requireRole */
export function requireRole(role: UserRole) {
  return new Elysia({ name: `require-role-${role}` })
    .use(authenticatePlugin())
    .onBeforeHandle(({ user }) => {
      requireRoleCheck(user, role);
    });
}

/** authenticate → super_admin only */
export function requireSuperAdmin() {
  return new Elysia({ name: "require-super-admin" })
    .use(authenticatePlugin())
    .onBeforeHandle(({ user }) => {
      requireSuperAdminCheck(user);
    });
}

/** @deprecated alias */
export function requireAuth() {
  return authenticatePlugin();
}
