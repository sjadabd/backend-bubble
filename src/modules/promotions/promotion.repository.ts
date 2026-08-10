import type { Document } from "mongoose";
import { Promotion, type PromotionDocument } from "./promotion.model";

type PromotionDoc = PromotionDocument & Document;

const listProjection = {
  title: 1,
  type: 1,
  status: 1,
  image: 1,
  description: 1,
  data: 1,
  startAt: 1,
  endAt: 1,
  priority: 1,
  deletedAt: 1,
  createdAt: 1,
} as const;

export const PromotionRepository = {
  async findById(id: string) {
    return Promotion.findById(id);
  },

  async findByIdLean(id: string) {
    return Promotion.findById(id).lean();
  },

  async findByCouponCode(code: string, excludeId?: string) {
    const filter: Record<string, unknown> = {
      type: "coupon",
      "data.code": code.toUpperCase(),
      deletedAt: null,
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return Promotion.findOne(filter).select("_id").lean();
  },

  async create(data: Record<string, unknown>) {
    return Promotion.create({
      ...data,
      deletedAt: null,
    });
  },

  async findManyLean(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Promotion.find(filter)
      .select(listProjection)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Promotion.countDocuments(filter);
  },

  async save(promotion: PromotionDoc) {
    return promotion.save();
  },
};
