import mongoose from "mongoose";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { ProductRepository } from "@modules/products";
import { PromotionRepository } from "./promotion.repository";
import {
  toPromotionDto,
  toPromotionListItem,
  Promotion,
  type PromotionDocument,
  type PromotionType,
} from "./promotion.model";
import { PromotionRedemption } from "./promotion-redemption.model";
import type {
  CreatePromotionInput,
  ListPromotionsQuery,
  UpdatePromotionInput,
} from "./promotion.validation";
import {
  bundleDataSchema,
  couponDataSchema,
  freeShippingDataSchema,
  productDiscountDataSchema,
} from "./promotion.validation";

function statusFilter(status: ListPromotionsQuery["status"]) {
  if (status === "active") return { status: "active", deletedAt: null };
  if (status === "inactive") return { status: "inactive", deletedAt: null };
  return { deletedAt: { $ne: null } };
}

function assertDateRange(startAt: Date, endAt: Date) {
  if (startAt >= endAt) {
    throw new AppError(messages.promotionDatesInvalid, statusCodes.BAD_REQUEST);
  }
}

async function assertProductsExist(productIds: string[]) {
  const unique = [...new Set(productIds)];
  for (const id of unique) {
    const product = await ProductRepository.findById(id);
    if (!product || product.deletedAt) {
      throw new AppError(messages.promotionProductInvalid, statusCodes.BAD_REQUEST);
    }
  }
}

function minProductPrice(product: {
  variants?: Array<{ price?: number; status?: string }>;
}): number | null {
  const prices = (product.variants ?? [])
    .filter((variant) => variant.status !== "inactive")
    .map((variant) => variant.price ?? 0)
    .filter((price) => Number.isFinite(price) && price >= 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

async function computeBundleOriginalPrice(productIds: string[]) {
  let total = 0;
  for (const id of productIds) {
    const product = await ProductRepository.findByIdLean(id);
    if (!product) continue;
    const price = minProductPrice(product);
    if (price === null) return null;
    total += price;
  }
  return total;
}

async function normalizeData(
  type: PromotionType,
  raw: Record<string, unknown>,
  excludePromotionId?: string,
) {
  if (type === "bundle") {
    const data = bundleDataSchema.parse(raw);
    await assertProductsExist(data.productIds);
    const computed = await computeBundleOriginalPrice(data.productIds);
    return {
      ...data,
      originalPrice:
        data.originalPrice !== undefined && data.originalPrice !== null
          ? data.originalPrice
          : computed,
    };
  }

  if (type === "product_discount") {
    const data = productDiscountDataSchema.parse(raw) as {
      productIds: string[];
      discountType: "percent" | "fixed_price";
      value: number;
    };
    await assertProductsExist(data.productIds);
    return data;
  }

  if (type === "coupon") {
    const data = couponDataSchema.parse(raw);
    const existing = await PromotionRepository.findByCouponCode(
      data.code,
      excludePromotionId,
    );
    if (existing) {
      throw new AppError(messages.promotionCouponInUse, statusCodes.CONFLICT);
    }
    return {
      ...data,
      usedCount: data.usedCount ?? 0,
    };
  }

  return freeShippingDataSchema.parse(raw);
}

export async function listPromotions(query: ListPromotionsQuery) {
  const filter: Record<string, unknown> = statusFilter(query.status);

  if (query.type) filter.type = query.type;

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { title: regex },
      { description: regex },
      { "data.code": regex },
    ];
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    PromotionRepository.findManyLean(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    PromotionRepository.count(filter),
  ]);

  return {
    items: items.map((item) =>
      toPromotionListItem(item as PromotionDocument),
    ),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
    type: query.type ?? "",
  };
}

export async function getPromotion(id: string) {
  const promotion = await PromotionRepository.findByIdLean(id);
  if (!promotion) {
    throw new AppError(messages.promotionNotFound, statusCodes.NOT_FOUND);
  }
  return toPromotionDto(promotion as PromotionDocument);
}

export async function createPromotion(input: CreatePromotionInput) {
  assertDateRange(input.startAt, input.endAt);
  const data = await normalizeData(input.type, input.data);

  const promotion = await PromotionRepository.create({
    title: input.title,
    type: input.type,
    status: input.status,
    image: input.image ?? "",
    description: input.description ?? "",
    startAt: input.startAt,
    endAt: input.endAt,
    priority: input.priority ?? 0,
    data,
  });

  return toPromotionDto(promotion);
}

export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  const promotion = await PromotionRepository.findById(id);
  if (!promotion) {
    throw new AppError(messages.promotionNotFound, statusCodes.NOT_FOUND);
  }

  if (input.title !== undefined) promotion.title = input.title;
  if (input.status !== undefined) promotion.status = input.status;
  if (input.image !== undefined) promotion.image = input.image;
  if (input.description !== undefined) promotion.description = input.description;
  if (input.priority !== undefined) promotion.priority = input.priority;
  if (input.startAt !== undefined) promotion.startAt = input.startAt;
  if (input.endAt !== undefined) promotion.endAt = input.endAt;

  assertDateRange(promotion.startAt, promotion.endAt);

  if (input.data !== undefined) {
    promotion.data = await normalizeData(
      promotion.type,
      input.data,
      promotion._id.toString(),
    );
  }

  await PromotionRepository.save(promotion);
  return toPromotionDto(promotion);
}

export async function deletePromotion(id: string) {
  const promotion = await PromotionRepository.findById(id);
  if (!promotion) {
    throw new AppError(messages.promotionNotFound, statusCodes.NOT_FOUND);
  }
  promotion.deletedAt = new Date();
  promotion.status = "inactive";
  await PromotionRepository.save(promotion);
  return { id };
}

export async function restorePromotion(id: string) {
  const promotion = await PromotionRepository.findById(id);
  if (!promotion) {
    throw new AppError(messages.promotionNotFound, statusCodes.NOT_FOUND);
  }
  if (!promotion.deletedAt) {
    throw new AppError(messages.promotionNotDeleted, statusCodes.BAD_REQUEST);
  }

  if (promotion.type === "coupon") {
    const code = String(
      (promotion.data as { code?: string })?.code ?? "",
    ).toUpperCase();
    if (code) {
      const existing = await PromotionRepository.findByCouponCode(
        code,
        promotion._id.toString(),
      );
      if (existing) {
        throw new AppError(messages.promotionCouponInUse, statusCodes.CONFLICT);
      }
    }
  }

  promotion.deletedAt = null;
  promotion.status = "active";
  await PromotionRepository.save(promotion);
  return toPromotionDto(promotion);
}

async function decrementPromotionUsedCount(promotionId: string) {
  const promotion = await Promotion.findById(promotionId);
  if (!promotion) return;
  const data = { ...(promotion.data ?? {}) };
  const usedCount =
    typeof data.usedCount === "number" && Number.isFinite(data.usedCount)
      ? data.usedCount
      : 0;
  data.usedCount = Math.max(0, usedCount - 1);
  promotion.data = data;
  promotion.markModified("data");
  await promotion.save();
}

/** Cancelled orders must not consume promotion usage (per-user or global). */
export async function releasePromotionUsageForOrder(orderId: string) {
  if (!/^[a-f\d]{24}$/i.test(orderId)) return;

  const orderObjectId = new mongoose.Types.ObjectId(orderId);
  const redemptions = await PromotionRedemption.find({ orderId: orderObjectId });
  if (!redemptions.length) return;

  const promotionIds = [
    ...new Set(redemptions.map((row) => row.promotionId.toString())),
  ];

  for (const promotionId of promotionIds) {
    await decrementPromotionUsedCount(promotionId);
  }

  await PromotionRedemption.deleteMany({ orderId: orderObjectId });
}
