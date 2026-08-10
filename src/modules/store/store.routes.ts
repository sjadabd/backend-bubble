import { Elysia } from "elysia";
import { jwtPlugin } from "@shared/auth";
import { toErrorResponse } from "@shared/middleware/error.middleware";
import { storeController } from "./store.controller";

/** Public storefront API — customer auth required for orders & Google login */
export const storeRoutes = new Elysia({ prefix: "/store" })
  .use(jwtPlugin)
  .onError(({ error, set }) => {
    const result = toErrorResponse(error);
    set.status = result.status;
    return result.body;
  })
  .get("/website", async ({ request }) => {
    const url = new URL(request.url);
    return storeController.website(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .get("/categories", async () => storeController.categories())
  .get("/products", async ({ request }) => {
    const url = new URL(request.url);
    return storeController.products(
      Object.fromEntries(url.searchParams.entries()),
    );
  })
  .get("/products/:id", async ({ params }) => {
    return storeController.productById(params);
  })
  .get("/promotions", async ({ request, jwt }) => {
    const url = new URL(request.url);
    return storeController.promotions(
      Object.fromEntries(url.searchParams.entries()),
      jwt,
      request,
    );
  })
  .get("/promotions/by-code", async ({ request, jwt }) => {
    const url = new URL(request.url);
    return storeController.promotionByCode(
      Object.fromEntries(url.searchParams.entries()),
      jwt,
      request,
    );
  })
  .get("/promotions/:id", async ({ params, jwt, request }) => {
    return storeController.promotionById(params, jwt, request);
  })
  .get("/auth/config", async () => storeController.authConfig())
  .post("/auth/google", async ({ body, jwt }) => {
    return storeController.googleLogin(body, jwt);
  })
  .get("/auth/me", async ({ jwt, request }) => {
    return storeController.me(jwt, request);
  })
  .post("/orders", async ({ body, jwt, request }) => {
    return storeController.createOrder(body, jwt, request);
  })
  .get("/orders", async ({ jwt, request }) => {
    return storeController.myOrders(jwt, request);
  })
  .get("/orders/:id", async ({ params, jwt, request }) => {
    return storeController.myOrderById(params, jwt, request);
  })
  .post("/orders/:id/cancel-request", async ({ params, body, jwt, request }) => {
    return storeController.requestCancel(params, body, jwt, request);
  })
  .get("/brands", async () => storeController.brands())
  .get("/partners", async () => storeController.partners());
