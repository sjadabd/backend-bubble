import { Elysia } from "elysia";
import { authenticatePlugin, requirePermissionCheck } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { writeAuditLog } from "@shared/audit";
import { productController } from "./product.controller";

export const productRoutes = new Elysia({ prefix: "/admin/products" })
  .use(authenticatePlugin())
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/", async ({ user, request }) => {
    requirePermissionCheck(user, "products.manage");
    const url = new URL(request.url);
    return productController.list(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .get("/:id", async ({ user, params }) => {
    requirePermissionCheck(user, "products.manage");
    return productController.get(params);
  })
  .post("/", async ({ user, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.create(body);
    writeAuditLog({
      action: "product.create",
      actorId: user.id,
      targetId: result.data.product.id,
      ip: request.headers.get("x-forwarded-for"),
      route: "/admin/products",
    });
    return result;
  })
  .patch("/:id", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.update(params, body);
    writeAuditLog({
      action: "product.update",
      actorId: user.id,
      targetId: result.data.product.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${result.data.product.id}`,
    });
    return result;
  })
  .delete("/:id", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.remove(params);
    writeAuditLog({
      action: "product.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${result.data.id}`,
    });
    return result;
  })
  .post("/:id/restore", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.restore(params);
    writeAuditLog({
      action: "product.restore",
      actorId: user.id,
      targetId: result.data.product.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${result.data.product.id}/restore`,
    });
    return result;
  })
  .post("/:id/variants", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.addVariant(params, body);
    writeAuditLog({
      action: "product.variant.create",
      actorId: user.id,
      targetId: result.data.variant.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${String((params as { id: string }).id)}/variants`,
    });
    return result;
  })
  .patch("/:id/variants/:variantId", async ({ user, params, body, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.updateVariant(params, body);
    writeAuditLog({
      action: "product.variant.update",
      actorId: user.id,
      targetId: result.data.variant.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${String((params as { id: string }).id)}/variants`,
    });
    return result;
  })
  .delete("/:id/variants/:variantId", async ({ user, params, request }) => {
    requirePermissionCheck(user, "products.manage");
    const result = await productController.removeVariant(params);
    writeAuditLog({
      action: "product.variant.delete",
      actorId: user.id,
      targetId: result.data.id,
      ip: request.headers.get("x-forwarded-for"),
      route: `/admin/products/${String((params as { id: string }).id)}/variants`,
    });
    return result;
  });
