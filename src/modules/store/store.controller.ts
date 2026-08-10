import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import { env } from "@config/env";
import {
  createStoreOrder,
  getCustomerOrderById,
  getCustomerOrders,
  requestCustomerOrderCancel,
  getStoreBrands,
  getStoreCategories,
  getStorePartners,
  getStoreProductById,
  getStoreProducts,
  getStorePromotionByCode,
  getStorePromotionById,
  getStorePromotions,
  getStoreWebsiteSections,
} from "./store.service";
import {
  createStoreOrderSchema,
  requestCancelOrderSchema,
  storeOrderIdParamSchema,
  storeProductIdParamSchema,
  storeProductsQuerySchema,
  storePromotionCodeQuerySchema,
  storePromotionIdParamSchema,
  storePromotionsQuerySchema,
  storeWebsiteQuerySchema,
} from "./store.validation";
import {
  getCustomerFromToken,
  loginWithGoogle,
  requireCustomerOptional,
} from "./store.customer-auth";

type JwtSigner = {
  sign: (payload: Record<string, string>) => Promise<string>;
  verify: (token?: string) => Promise<unknown>;
};

export const storeController = {
  website: async (query: unknown) => {
    const input = parseBody(storeWebsiteQuerySchema, query);
    return { success: true, data: await getStoreWebsiteSections(input) };
  },

  categories: async () => {
    return { success: true, data: await getStoreCategories() };
  },

  products: async (query: unknown) => {
    const input = parseBody(storeProductsQuerySchema, query);
    return { success: true, data: await getStoreProducts(input) };
  },

  productById: async (params: unknown) => {
    const { id } = parseBody(storeProductIdParamSchema, params);
    return { success: true, data: await getStoreProductById(id) };
  },

  promotions: async (
    query: unknown,
    jwt: { verify: (token?: string) => Promise<unknown> },
    request: Request,
  ) => {
    const input = parseBody(storePromotionsQuerySchema, query);
    const customer = await requireCustomerOptional(jwt, request);
    return {
      success: true,
      data: await getStorePromotions(input, customer?.id ?? null),
    };
  },

  promotionById: async (
    params: unknown,
    jwt: { verify: (token?: string) => Promise<unknown> },
    request: Request,
  ) => {
    const { id } = parseBody(storePromotionIdParamSchema, params);
    const customer = await requireCustomerOptional(jwt, request);
    return {
      success: true,
      data: await getStorePromotionById(id, customer?.id ?? null),
    };
  },

  promotionByCode: async (
    query: unknown,
    jwt: { verify: (token?: string) => Promise<unknown> },
    request: Request,
  ) => {
    const { code } = parseBody(storePromotionCodeQuerySchema, query);
    const customer = await requireCustomerOptional(jwt, request);
    return {
      success: true,
      data: await getStorePromotionByCode(code, customer?.id ?? null),
    };
  },

  authConfig: async () => ({
    success: true,
    data: {
      googleEnabled: Boolean(env.googleClientId),
      googleClientId: env.googleClientId || null,
    },
  }),

  googleLogin: async (body: unknown, jwt: JwtSigner) => {
    const customer = await loginWithGoogle(body);
    const token = await jwt.sign({
      sub: customer.id,
      kind: "customer",
    });
    return {
      success: true,
      message: messages.googleLoggedIn,
      data: { token, customer },
    };
  },

  me: async (jwt: JwtSigner, request: Request) => {
    const customer = await getCustomerFromToken(jwt, request);
    return { success: true, data: { customer } };
  },

  createOrder: async (body: unknown, jwt: JwtSigner, request: Request) => {
    const customer = await getCustomerFromToken(jwt, request);
    const input = parseBody(createStoreOrderSchema, body);
    const order = await createStoreOrder(input, customer.id);
    return {
      success: true,
      message: messages.orderCreated,
      data: { order },
    };
  },

  myOrders: async (jwt: JwtSigner, request: Request) => {
    const customer = await getCustomerFromToken(jwt, request);
    return {
      success: true,
      data: await getCustomerOrders(customer.id),
    };
  },

  myOrderById: async (
    params: unknown,
    jwt: JwtSigner,
    request: Request,
  ) => {
    const customer = await getCustomerFromToken(jwt, request);
    const { id } = parseBody(storeOrderIdParamSchema, params);
    return {
      success: true,
      data: await getCustomerOrderById(customer.id, id),
    };
  },

  requestCancel: async (
    params: unknown,
    body: unknown,
    jwt: JwtSigner,
    request: Request,
  ) => {
    const customer = await getCustomerFromToken(jwt, request);
    const { id } = parseBody(storeOrderIdParamSchema, params);
    const { reason } = parseBody(requestCancelOrderSchema, body);
    const order = await requestCustomerOrderCancel(customer.id, id, reason);
    return {
      success: true,
      message: "تم إرسال طلب الإلغاء وبانتظار تأكيد الموظف",
      data: { order },
    };
  },

  brands: async () => {
    return { success: true, data: await getStoreBrands() };
  },

  partners: async () => {
    return { success: true, data: await getStorePartners() };
  },
};
