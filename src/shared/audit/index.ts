import { logger } from "@config/logger";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.restore"
  | "user.permission"
  | "user.reset_password"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "category.restore"
  | "brand.create"
  | "brand.update"
  | "brand.delete"
  | "brand.restore"
  | "tag.create"
  | "tag.update"
  | "tag.delete"
  | "tag.restore"
  | "attribute.create"
  | "attribute.update"
  | "attribute.delete"
  | "attribute.restore"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.restore"
  | "product.variant.create"
  | "product.variant.update"
  | "product.variant.delete"
  | "promotion.create"
  | "promotion.update"
  | "promotion.delete"
  | "promotion.restore"
  | "website.section.create"
  | "website.section.update"
  | "website.section.delete"
  | "website.section.restore"
  | "partner.create"
  | "partner.update"
  | "partner.delete"
  | "partner.restore"
  | "upload.create"
  | "order.update"
  | "auth.login"
  | "auth.bootstrap";

export type AuditEntry = {
  action: AuditAction;
  actorId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  route?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
};

/** Structured admin audit trail (console for now; swap to DB later). */
export function writeAuditLog(entry: AuditEntry) {
  logger.info("audit", {
    ...entry,
    at: new Date().toISOString(),
  });
}
