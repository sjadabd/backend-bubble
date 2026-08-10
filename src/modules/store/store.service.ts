import mongoose from "mongoose";
import { WebsiteRepository } from "@modules/website";
import {
  toWebsiteSectionDto,
  type WebsiteSectionDocument,
} from "@modules/website/website.model";
import { ProductRepository } from "@modules/products";
import {
  toProductListItem,
  type ProductDocument,
} from "@modules/products/product.model";
import { BrandRepository } from "@modules/brands";
import { toBrandDto, type BrandDocument } from "@modules/brands/brand.model";
import { PartnerRepository } from "@modules/partners";
import {
  toPartnerDto,
  type PartnerDocument,
} from "@modules/partners/partner.model";
import { CategoryRepository, toCategoryDto } from "@modules/categories";
import type { CategoryDocument } from "@modules/categories/category.model";
import { PromotionRepository } from "@modules/promotions";
import {
  toStorePromotionSummary,
  toPromotionDto,
  type PromotionDocument,
} from "@modules/promotions/promotion.model";
import { PromotionRedemption } from "@modules/promotions/promotion-redemption.model";
import { Promotion } from "@modules/promotions/promotion.model";
import { CustomerRepository } from "@modules/customers";
import {
  CANCELABLE_ORDER_STATUSES,
  StoreOrder,
  toCustomerOrderDto,
  toStoreOrderDto,
  type StoreOrderDocument,
} from "@modules/orders/order.model";
import {
  orderEventFromDto,
  publishOrderRealtime,
} from "@shared/websocket/order-realtime";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import type {
  CreateStoreOrderInput,
  StoreProductsQuery,
  StorePromotionsQuery,
  StoreWebsiteQuery,
} from "./store.validation";

function inSchedule(startAt?: Date | null, endAt?: Date | null) {
  const now = Date.now();
  if (startAt && startAt.getTime() > now) return false;
  if (endAt && endAt.getTime() < now) return false;
  return true;
}

function toStoreProduct(product: ProductDocument, brandName: string | null) {
  const base = toProductListItem(product, brandName);
  const prices = (product.variants ?? [])
    .filter((v) => v.status !== "inactive")
    .map((v) => ({
      price: v.price ?? 0,
      oldPrice: v.oldPrice ?? null,
    }));
  const best = prices.sort((a, b) => a.price - b.price)[0];
  return {
    id: base.id,
    title: base.title,
    image: base.image,
    brandName: base.brandName,
    remainingStock: base.remainingStock,
    price: best?.price ?? 0,
    oldPrice: best?.oldPrice ?? null,
    slug: product.slug ?? null,
    featured: Boolean(product.featured),
  };
}

function buildStoreProductFilter(query: StoreProductsQuery) {
  const filter: Record<string, unknown> = {
    status: "active",
    deletedAt: null,
  };

  const search = (query.q || query.search || "").trim();
  if (search) {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ title: regex }, { titleEn: regex }, { slug: regex }];
  }

  if (query.categoryId) {
    // Aggregate $match does not cast strings → ObjectId like find()
    filter.categoryIds = new mongoose.Types.ObjectId(query.categoryId);
  }

  if (query.featured === true) {
    filter.featured = true;
  }

  const variantMatch: Record<string, unknown> = {
    status: { $ne: "inactive" },
  };
  const price: Record<string, number> = {};
  if (query.minPrice !== undefined) price.$gte = query.minPrice;
  if (query.maxPrice !== undefined) price.$lte = query.maxPrice;
  if (Object.keys(price).length) variantMatch.price = price;

  const andClauses: Record<string, unknown>[] = [];

  if (Object.keys(variantMatch).length > 1 || variantMatch.price) {
    andClauses.push({ variants: { $elemMatch: variantMatch } });
  }

  if (query.onSale === true) {
    andClauses.push({
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$variants", []] },
                as: "v",
                cond: {
                  $and: [
                    { $ne: ["$$v.status", "inactive"] },
                    { $ne: [{ $ifNull: ["$$v.oldPrice", null] }, null] },
                    { $gt: ["$$v.oldPrice", "$$v.price"] },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    });
  }

  if (andClauses.length === 1) {
    Object.assign(filter, andClauses[0]);
  } else if (andClauses.length > 1) {
    filter.$and = andClauses;
  }

  return filter;
}

export async function getStoreWebsiteSections(query: StoreWebsiteQuery) {
  const filter = {
    page: query.page,
    status: "active",
    deletedAt: null,
  };

  const items = await WebsiteRepository.findManyLean(filter, {
    sort: { sortOrder: 1, createdAt: 1 },
    skip: 0,
    limit: 100,
  });

  const sections = items
    .filter((item) =>
      inSchedule(
        (item as WebsiteSectionDocument).startAt,
        (item as WebsiteSectionDocument).endAt,
      ),
    )
    .map((item) => toWebsiteSectionDto(item as WebsiteSectionDocument));

  return { page: query.page, sections };
}

export async function getStoreCategories() {
  const items = await CategoryRepository.findMany(
    { deletedAt: null, isActive: true },
    { sort: { createdAt: -1 }, skip: 0, limit: 100 },
  );

  return {
    items: items.map((item) => {
      const dto = toCategoryDto(item as CategoryDocument);
      return {
        id: dto.id,
        title: dto.title,
        logo: dto.logo,
        description: dto.description,
      };
    }),
  };
}

async function loadStoreProductsOrdered(ids: string[]) {
  if (!ids.length) return [] as ReturnType<typeof toStoreProduct>[];
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const items = await ProductRepository.findManyLean(
    {
      _id: { $in: objectIds },
      status: "active",
      deletedAt: null,
    },
    { sort: { createdAt: -1 }, skip: 0, limit: ids.length },
  );
  const brandIds = [
    ...new Set(items.map((item) => item.brandId.toString())),
  ];
  const brands = await BrandRepository.findByIds(brandIds);
  const brandMap = new Map(
    brands.map((brand) => [brand._id.toString(), brand.name] as const),
  );
  const byId = new Map(
    items.map((item) => [
      item._id.toString(),
      toStoreProduct(
        item as ProductDocument,
        brandMap.get(item.brandId.toString()) ?? null,
      ),
    ]),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

/** Most ordered products from completed store orders; falls back to featured/newest */
async function getPopularProductIds(limit: number) {
  const rows = await StoreOrder.aggregate<{ _id: mongoose.Types.ObjectId; qty: number }>([
    { $match: { status: { $nin: ["cancelled"] } } },
    { $unwind: "$lines" },
    {
      $match: {
        "lines.kind": "product",
        "lines.productId": { $ne: null },
      },
    },
    {
      $group: {
        _id: "$lines.productId",
        qty: { $sum: "$lines.quantity" },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => row._id.toString()).filter(Boolean);
}

export async function getStoreProducts(query: StoreProductsQuery) {
  const skip = (query.page - 1) * query.limit;

  if (query.sort === "popular") {
    const popularIds = await getPopularProductIds(query.limit + skip);
    const pageIds = popularIds.slice(skip, skip + query.limit);
    let items = await loadStoreProductsOrdered(pageIds);

    if (items.length < query.limit) {
      const exclude = new Set(items.map((item) => item.id));
      const fill = await ProductRepository.findStoreCatalog(
        {
          ...buildStoreProductFilter({ ...query, sort: "newest" }),
          _id: {
            $nin: [...exclude].map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        {
          sort: "popular",
          skip: 0,
          limit: query.limit - items.length,
        },
      );
      const brandIds = [
        ...new Set(fill.items.map((item) => item.brandId.toString())),
      ];
      const brands = await BrandRepository.findByIds(brandIds);
      const brandMap = new Map(
        brands.map((brand) => [brand._id.toString(), brand.name] as const),
      );
      items = [
        ...items,
        ...fill.items.map((item) =>
          toStoreProduct(
            item as ProductDocument,
            brandMap.get(item.brandId.toString()) ?? null,
          ),
        ),
      ];
    }

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: Math.max(popularIds.length, items.length),
    };
  }

  const filter = buildStoreProductFilter(query);
  const { items, total } = await ProductRepository.findStoreCatalog(filter, {
    sort: query.sort ?? "newest",
    skip,
    limit: query.limit,
  });

  const brandIds = [
    ...new Set(items.map((item) => item.brandId.toString())),
  ];
  const brands = await BrandRepository.findByIds(brandIds);
  const brandMap = new Map(
    brands.map((brand) => [brand._id.toString(), brand.name] as const),
  );

  return {
    items: items.map((item) =>
      toStoreProduct(
        item as ProductDocument,
        brandMap.get(item.brandId.toString()) ?? null,
      ),
    ),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getStoreProductById(id: string) {
  const product = await ProductRepository.findByIdLean(id);
  if (
    !product ||
    product.deletedAt ||
    (product as ProductDocument).status !== "active"
  ) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }

  const doc = product as ProductDocument;
  const brand = await BrandRepository.findById(doc.brandId.toString());
  const brandName =
    brand && !brand.deletedAt && brand.status === "active" ? brand.name : null;

  const categoryIds = (doc.categoryIds ?? []).map((cid) => cid.toString());
  const categories = await CategoryRepository.findByIds(categoryIds);
  const categoryItems = categories
    .filter((c) => !c.deletedAt && c.isActive !== false)
    .map((c) => ({
      id: c._id.toString(),
      title: c.title,
    }));

  const base = toStoreProduct(doc, brandName);
  const gallery = [
    ...(doc.gallery ?? [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => item.url)
      .filter(Boolean),
    ...((doc.variants ?? [])
      .map((v) => v.image)
      .filter((url): url is string => Boolean(url?.trim())) ?? []),
  ];
  const uniqueGallery = [...new Set(gallery)];

  return {
    ...base,
    description: doc.description?.trim() ? doc.description : null,
    features: doc.features ?? [],
    gallery: uniqueGallery.length
      ? uniqueGallery
      : base.image
        ? [base.image]
        : [],
    categories: categoryItems,
  };
}

export async function getStorePromotions(
  query: StorePromotionsQuery,
  customerId?: string | null,
) {
  const filter: Record<string, unknown> = {
    status: "active",
    deletedAt: null,
  };
  if (query.type) filter.type = query.type;

  const items = await PromotionRepository.findManyLean(filter, {
    sort: { priority: -1, createdAt: -1 },
    skip: 0,
    limit: Math.max(query.limit * 3, query.limit),
  });

  const scheduled = items.filter((item) =>
    inSchedule(
      (item as PromotionDocument).startAt,
      (item as PromotionDocument).endAt,
    ),
  );

  const enriched = [];
  for (const item of scheduled) {
    const doc = item as PromotionDocument;
    if (isGloballyUsageExhausted((doc.data ?? {}) as Record<string, unknown>)) {
      continue;
    }
    const eligibility = await getPromotionEligibility(doc, customerId);
    if (!eligibility.eligible) continue;
    enriched.push(
      withEligibilitySummary(toStorePromotionSummary(doc), eligibility),
    );
    if (enriched.length >= query.limit) break;
  }

  return { items: enriched };
}

export async function getStorePromotionById(
  id: string,
  customerId?: string | null,
) {
  const promotion = await PromotionRepository.findByIdLean(id);
  if (
    !promotion ||
    promotion.deletedAt ||
    (promotion as PromotionDocument).status !== "active"
  ) {
    throw new AppError("العرض غير موجود", statusCodes.NOT_FOUND);
  }

  const doc = promotion as PromotionDocument;
  if (!inSchedule(doc.startAt, doc.endAt)) {
    throw new AppError("العرض غير متاح حالياً", statusCodes.NOT_FOUND);
  }

  if (isGloballyUsageExhausted((doc.data ?? {}) as Record<string, unknown>)) {
    throw new AppError(messages.promotionUsageExceeded, statusCodes.BAD_REQUEST);
  }

  const eligibility = await getPromotionEligibility(doc, customerId);
  const dto = toPromotionDto(doc);
  const data = doc.data ?? {};
  const productIds = Array.isArray(data.productIds)
    ? (data.productIds as unknown[])
        .map((value) => String(value))
        .filter((value) => /^[a-f\d]{24}$/i.test(value))
    : [];

  const products = await loadStoreProductsByIds(productIds);

  return {
    ...withEligibilitySummary(toStorePromotionSummary(doc), eligibility),
    data: dto.data,
    products,
  };
}

export async function getStorePromotionByCode(
  code: string,
  customerId?: string | null,
) {
  const match = await PromotionRepository.findByCouponCode(code);
  if (!match?._id) {
    throw new AppError("كود الخصم غير صالح أو منتهي", statusCodes.NOT_FOUND);
  }
  return getStorePromotionById(match._id.toString(), customerId);
}

async function loadStoreProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const unique = [...new Set(ids)];
  const objectIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  const items = await ProductRepository.findManyLean(
    {
      _id: { $in: objectIds },
      status: "active",
      deletedAt: null,
    },
    { sort: { createdAt: -1 }, skip: 0, limit: unique.length },
  );

  const brandIds = [
    ...new Set(items.map((item) => item.brandId.toString())),
  ];
  const brands = await BrandRepository.findByIds(brandIds);
  const brandMap = new Map(
    brands.map((brand) => [brand._id.toString(), brand.name] as const),
  );

  const byId = new Map(
    items.map((item) => [
      item._id.toString(),
      toStoreProduct(
        item as ProductDocument,
        brandMap.get(item.brandId.toString()) ?? null,
      ),
    ]),
  );

  return unique
    .map((id) => byId.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function getStoreBrands() {
  const items = await BrandRepository.findMany(
    { status: "active", deletedAt: null },
    { sort: { sortOrder: 1, createdAt: -1 }, skip: 0, limit: 24 },
  );

  return {
    items: items.map((item) => {
      const dto = toBrandDto(item as BrandDocument);
      return {
        id: dto.id,
        name: dto.name,
        logo: dto.logo,
      };
    }),
  };
}

export async function getStorePartners() {
  const items = await PartnerRepository.findMany(
    { status: "active", deletedAt: null },
    { sort: { sortOrder: 1, createdAt: -1 }, skip: 0, limit: 24 },
  );

  return {
    items: items.map((item) => {
      const dto = toPartnerDto(item as PartnerDocument);
      return {
        id: dto.id,
        name: dto.name,
        logo: dto.logo,
      };
    }),
  };
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function getActivePromotion(id: string) {
  const promotion = await PromotionRepository.findByIdLean(id);
  if (
    !promotion ||
    promotion.deletedAt ||
    (promotion as PromotionDocument).status !== "active"
  ) {
    return null;
  }
  const doc = promotion as PromotionDocument;
  if (!inSchedule(doc.startAt, doc.endAt)) return null;
  return doc;
}

function readPromotionUsage(data: Record<string, unknown>) {
  return {
    usageLimit: typeof data.usageLimit === "number" ? data.usageLimit : null,
    usedCount: typeof data.usedCount === "number" ? data.usedCount : 0,
    perUserLimit:
      typeof data.perUserLimit === "number" ? data.perUserLimit : null,
  };
}

function isGloballyUsageExhausted(data: Record<string, unknown>) {
  const { usageLimit, usedCount } = readPromotionUsage(data);
  return usageLimit !== null && usedCount >= usageLimit;
}

async function getCustomerRedemptionCount(
  customerId: string,
  promotionId: mongoose.Types.ObjectId,
) {
  return PromotionRedemption.countDocuments({
    customerId: new mongoose.Types.ObjectId(customerId),
    promotionId,
  });
}

async function getPromotionEligibility(
  promotion: PromotionDocument,
  customerId?: string | null,
) {
  const data = (promotion.data ?? {}) as Record<string, unknown>;
  const usage = readPromotionUsage(data);

  if (isGloballyUsageExhausted(data)) {
    return {
      eligible: false,
      reason: messages.promotionUsageExceeded,
      ...usage,
      userUsedCount: null as number | null,
    };
  }

  if (usage.perUserLimit !== null && customerId) {
    const userUsedCount = await getCustomerRedemptionCount(
      customerId,
      promotion._id,
    );
    if (userUsedCount >= usage.perUserLimit) {
      return {
        eligible: false,
        reason: messages.promotionUserLimitExceeded,
        ...usage,
        userUsedCount,
      };
    }
    return {
      eligible: true,
      reason: null as string | null,
      ...usage,
      userUsedCount,
    };
  }

  return {
    eligible: true,
    reason: null as string | null,
    ...usage,
    userUsedCount: null as number | null,
  };
}

function withEligibilitySummary(
  base: ReturnType<typeof toStorePromotionSummary>,
  eligibility: Awaited<ReturnType<typeof getPromotionEligibility>>,
) {
  return {
    ...base,
    summary: {
      ...base.summary,
      usageLimit: eligibility.usageLimit,
      usedCount: eligibility.usedCount,
      perUserLimit: eligibility.perUserLimit,
      userUsedCount: eligibility.userUsedCount,
      eligible: eligibility.eligible,
      eligibilityReason: eligibility.reason,
    },
  };
}

async function assertPromotionUsageAllowed(
  customerId: string,
  promotion: PromotionDocument,
) {
  const eligibility = await getPromotionEligibility(promotion, customerId);
  if (!eligibility.eligible) {
    throw new AppError(
      eligibility.reason || messages.promotionUsageExceeded,
      statusCodes.BAD_REQUEST,
    );
  }
}

async function incrementPromotionUsedCount(promotionId: string) {
  const promotion = await Promotion.findById(promotionId);
  if (!promotion) return;
  const data = { ...(promotion.data ?? {}) };
  const usedCount =
    typeof data.usedCount === "number" && Number.isFinite(data.usedCount)
      ? data.usedCount
      : 0;
  data.usedCount = usedCount + 1;
  promotion.data = data;
  promotion.markModified("data");
  await promotion.save();
}

export async function createStoreOrder(
  input: CreateStoreOrderInput,
  customerId: string,
) {
  if (!customerId) {
    throw new AppError(messages.orderLoginRequired, statusCodes.UNAUTHORIZED);
  }
  if (!input.lines.length) {
    throw new AppError(messages.orderEmpty, statusCodes.BAD_REQUEST);
  }

  const resolvedLines = [];
  let subtotal = 0;
  const appliedPromos = new Map<
    string,
    "coupon" | "free_shipping" | "bundle" | "product_discount"
  >();

  for (const line of input.lines) {
    const quantity = Math.max(1, line.quantity || 1);

    if (line.kind === "bundle") {
      if (!line.promotionId) {
        throw new AppError(messages.promotionNotFound, statusCodes.BAD_REQUEST);
      }
      const promotion = await getActivePromotion(line.promotionId);
      if (!promotion || promotion.type !== "bundle") {
        throw new AppError(
          messages.promotionUnavailable,
          statusCodes.BAD_REQUEST,
        );
      }
      await assertPromotionUsageAllowed(customerId, promotion);
      appliedPromos.set(promotion._id.toString(), "bundle");
      const offerPrice = asNumber(promotion.data?.offerPrice, line.unitPrice);
      const productIds = Array.isArray(promotion.data?.productIds)
        ? (promotion.data.productIds as unknown[]).map((v) => String(v))
        : (line.productIds ?? []);
      const lineTotal = offerPrice * quantity;
      subtotal += lineTotal;
      resolvedLines.push({
        kind: "bundle" as const,
        productId: null,
        promotionId: new mongoose.Types.ObjectId(line.promotionId),
        title: line.title || promotion.title,
        image: line.image ?? promotion.image ?? null,
        unitPrice: offerPrice,
        quantity,
        productIds: productIds
          .filter((id) => /^[a-f\d]{24}$/i.test(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
        lineTotal,
      });
      continue;
    }

    if (!line.productId) {
      throw new AppError(messages.productNotFound, statusCodes.BAD_REQUEST);
    }
    const product = await ProductRepository.findByIdLean(line.productId);
    if (
      !product ||
      product.deletedAt ||
      (product as ProductDocument).status !== "active"
    ) {
      throw new AppError(messages.productNotFound, statusCodes.BAD_REQUEST);
    }

    const storeProduct = toStoreProduct(product as ProductDocument, null);
    let unitPrice = storeProduct.price;

    if (line.promotionId) {
      const promotion = await getActivePromotion(line.promotionId);
      if (promotion?.type === "product_discount") {
        await assertPromotionUsageAllowed(customerId, promotion);
        appliedPromos.set(promotion._id.toString(), "product_discount");
        const ids = Array.isArray(promotion.data?.productIds)
          ? (promotion.data.productIds as unknown[]).map((v) => String(v))
          : [];
        if (ids.includes(line.productId)) {
          const discountType = String(promotion.data?.discountType ?? "");
          const value = asNumber(promotion.data?.value, 0);
          if (discountType === "percent") {
            unitPrice = Math.max(
              0,
              Math.round(storeProduct.price * (1 - value / 100)),
            );
          } else if (discountType === "fixed_price") {
            unitPrice = Math.max(0, value);
          }
        }
      }
    }

    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    resolvedLines.push({
      kind: "product" as const,
      productId: new mongoose.Types.ObjectId(line.productId),
      promotionId: line.promotionId
        ? new mongoose.Types.ObjectId(line.promotionId)
        : null,
      title: line.title || storeProduct.title,
      image: line.image ?? storeProduct.image,
      unitPrice,
      quantity,
      productIds: [],
      lineTotal,
    });
  }

  let discount = 0;
  let couponCode: string | null = null;
  let freeShipping = false;
  let primaryPromotionId: string | null = input.promotionId ?? null;

  if (input.couponCode?.trim()) {
    const code = input.couponCode.trim().toUpperCase();
    const coupon = await PromotionRepository.findByCouponCode(code);
    if (!coupon) {
      throw new AppError(messages.orderInvalidCoupon, statusCodes.BAD_REQUEST);
    }
    const promotion = await getActivePromotion(coupon._id.toString());
    if (!promotion || promotion.type !== "coupon") {
      throw new AppError(messages.orderInvalidCoupon, statusCodes.BAD_REQUEST);
    }
    await assertPromotionUsageAllowed(customerId, promotion);
    appliedPromos.set(promotion._id.toString(), "coupon");
    const minOrder = asNumber(promotion.data?.minOrderAmount, 0);
    if (subtotal < minOrder) {
      throw new AppError(
        `الحد الأدنى للطلب ${minOrder} د.ع لتطبيق الكوبون`,
        statusCodes.BAD_REQUEST,
      );
    }
    const discountType = String(promotion.data?.discountType ?? "");
    const value = asNumber(promotion.data?.value, 0);
    if (discountType === "percent") {
      discount = Math.round(subtotal * (value / 100));
    } else {
      discount = Math.min(subtotal, value);
    }
    couponCode = code;
    primaryPromotionId = promotion._id.toString();
  }

  if (input.freeShipping) {
    const shippingPromoId =
      input.freeShippingPromotionId ||
      (input.promotionId && !input.couponCode ? input.promotionId : null);
    if (!shippingPromoId) {
      throw new AppError(
        "تعذر تطبيق الشحن المجاني — العرض غير محدد",
        statusCodes.BAD_REQUEST,
      );
    }
    const promotion = await getActivePromotion(shippingPromoId);
    if (!promotion || promotion.type !== "free_shipping") {
      throw new AppError(
        messages.promotionUnavailable,
        statusCodes.BAD_REQUEST,
      );
    }
    await assertPromotionUsageAllowed(customerId, promotion);
    const minOrder = asNumber(promotion.data?.minOrderAmount, 0);
    if (subtotal < minOrder) {
      throw new AppError(
        `الحد الأدنى للطلب ${minOrder} د.ع لتفعيل الشحن المجاني`,
        statusCodes.BAD_REQUEST,
      );
    }
    freeShipping = true;
    appliedPromos.set(promotion._id.toString(), "free_shipping");
    primaryPromotionId = promotion._id.toString();
  }

  const total = Math.max(0, subtotal - discount);
  const appliedIds = [...appliedPromos.keys()];

  const order = await StoreOrder.create({
    customerId: new mongoose.Types.ObjectId(customerId),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress ?? "",
    notes: input.notes ?? "",
    lines: resolvedLines,
    subtotal,
    discount,
    total,
    couponCode,
    promotionId: primaryPromotionId
      ? new mongoose.Types.ObjectId(primaryPromotionId)
      : null,
    freeShipping,
    appliedPromotionIds: appliedIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    ),
    status: "pending",
    statusHistory: [
      {
        status: "pending",
        note: "تم استلام الطلب",
        changedBy: null,
        changedAt: new Date(),
      },
    ],
  });

  for (const [promoId, kind] of appliedPromos) {
    await PromotionRedemption.create({
      customerId: new mongoose.Types.ObjectId(customerId),
      promotionId: new mongoose.Types.ObjectId(promoId),
      orderId: order._id,
      kind,
    });
    await incrementPromotionUsedCount(promoId);
  }

  // Remember checkout contact for next orders (editable on checkout)
  await CustomerRepository.updateCheckoutProfile(customerId, {
    name: input.customerName,
    phone: input.customerPhone,
    address: input.customerAddress ?? "",
  });

  const dto = toCustomerOrderDto(order);
  publishOrderRealtime(
    orderEventFromDto({ type: "order.created", order: dto }),
  );
  return dto;
}

export async function getCustomerOrders(customerId: string) {
  const items = await StoreOrder.find({
    customerId: new mongoose.Types.ObjectId(customerId),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    items: items.map((item) =>
      toCustomerOrderDto(
        item as unknown as Parameters<typeof toCustomerOrderDto>[0],
      ),
    ),
  };
}

export async function getCustomerOrderById(
  customerId: string,
  orderId: string,
) {
  if (!/^[a-f\d]{24}$/i.test(orderId)) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }
  const order = await StoreOrder.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    customerId: new mongoose.Types.ObjectId(customerId),
  }).lean();
  if (!order) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }
  return toCustomerOrderDto(
    order as unknown as Parameters<typeof toCustomerOrderDto>[0],
  );
}

export async function requestCustomerOrderCancel(
  customerId: string,
  orderId: string,
  reason: string,
) {
  if (!/^[a-f\d]{24}$/i.test(orderId)) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }

  const order = await StoreOrder.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    customerId: new mongoose.Types.ObjectId(customerId),
  });
  if (!order) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }

  if (order.status === "delivered") {
    throw new AppError(
      "تم تسليم الطلب ولا يمكن طلب إلغائه",
      statusCodes.BAD_REQUEST,
    );
  }

  if (!CANCELABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      "لا يمكن طلب إلغاء الطلب في هذه المرحلة",
      statusCodes.BAD_REQUEST,
    );
  }

  if (order.cancelRequest?.status === "pending") {
    throw new AppError(
      "لديك طلب إلغاء قيد المراجعة بالفعل",
      statusCodes.BAD_REQUEST,
    );
  }

  const trimmed = reason.trim();
  order.cancelRequest = {
    status: "pending",
    reason: trimmed,
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: "",
  };

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: order.status,
    note: `طلب العميل إلغاء الطلب: ${trimmed}`,
    changedBy: null,
    changedAt: new Date(),
  });

  await order.save();
  const dto = toCustomerOrderDto(order as StoreOrderDocument);
  publishOrderRealtime(
    orderEventFromDto({ type: "order.cancel_requested", order: dto }),
  );
  return dto;
}
