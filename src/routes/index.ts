import { Elysia } from "elysia";
import { APP_NAME, APP_VERSION, messages } from "@constants";
import { authRoutes } from "@modules/auth";
import { userRoutes } from "@modules/users";
import { categoryRoutes } from "@modules/categories";
import { brandRoutes } from "@modules/brands";
import { partnerRoutes } from "@modules/partners";
import { tagRoutes } from "@modules/tags";
import { attributeRoutes } from "@modules/attributes";
import { productRoutes } from "@modules/products";
import { promotionRoutes } from "@modules/promotions";
import { websiteRoutes } from "@modules/website";
import { storeRoutes } from "@modules/store";
import { orderRoutes } from "@modules/orders";
import { dashboardRoutes } from "@modules/dashboard";
import { customerRoutes } from "@modules/customers";
import { orderWsRoutes } from "../sockets/orders.ws";

export const routes = new Elysia()
  .get("/", () => ({
    name: APP_NAME,
    version: APP_VERSION,
    status: messages.statusOk,
  }))
  .get("/health", () => ({
    status: messages.statusHealthy,
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(userRoutes)
  .use(customerRoutes)
  .use(categoryRoutes)
  .use(brandRoutes)
  .use(partnerRoutes)
  .use(tagRoutes)
  .use(attributeRoutes)
  .use(productRoutes)
  .use(promotionRoutes)
  .use(websiteRoutes)
  .use(orderRoutes)
  .use(dashboardRoutes)
  .use(storeRoutes)
  .use(orderWsRoutes);
