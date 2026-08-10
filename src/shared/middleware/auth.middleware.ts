/**
 * @deprecated Use @shared/auth guards — kept as re-exports for compatibility.
 */
export {
  authenticatePlugin as authPlugin,
  requireAuth,
  requireSuperAdmin,
  requirePermission,
  authenticate as resolveUser,
} from "@shared/auth";
