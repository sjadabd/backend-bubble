import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PROMOTION_TYPES = [
  "bundle",
  "product_discount",
  "coupon",
  "free_shipping",
] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];

const promotionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: PROMOTION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

promotionSchema.index({ deletedAt: 1, status: 1, priority: -1 });
promotionSchema.index({ type: 1, deletedAt: 1 });
promotionSchema.index({ "data.code": 1 }, { sparse: true });
promotionSchema.index({ startAt: 1, endAt: 1 });

export type PromotionDocument = Omit<
  InferSchemaType<typeof promotionSchema>,
  "deletedAt" | "data" | "type" | "status"
> & {
  _id: mongoose.Types.ObjectId;
  type: PromotionType;
  status: "active" | "inactive";
  data: Record<string, unknown>;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Promotion: Model<PromotionDocument> =
  mongoose.models.Promotion ??
  mongoose.model<PromotionDocument>("Promotion", promotionSchema);

export function toPromotionDto(promotion: PromotionDocument) {
  return {
    id: promotion._id.toString(),
    title: promotion.title,
    type: promotion.type,
    status: promotion.status,
    image: promotion.image?.trim() ? promotion.image : null,
    description: promotion.description?.trim()
      ? promotion.description
      : null,
    startAt: promotion.startAt.toISOString(),
    endAt: promotion.endAt.toISOString(),
    priority: promotion.priority ?? 0,
    data: promotion.data ?? {},
    deletedAt: promotion.deletedAt ? promotion.deletedAt.toISOString() : null,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
  };
}

export function toPromotionListItem(promotion: PromotionDocument) {
  return {
    id: promotion._id.toString(),
    title: promotion.title,
    type: promotion.type,
    status: promotion.status,
    image: promotion.image?.trim() ? promotion.image : null,
    description: promotion.description?.trim()
      ? promotion.description
      : null,
    startAt: promotion.startAt.toISOString(),
    endAt: promotion.endAt.toISOString(),
    priority: promotion.priority ?? 0,
    data: promotion.data ?? {},
    deletedAt: promotion.deletedAt ? promotion.deletedAt.toISOString() : null,
    createdAt: promotion.createdAt.toISOString(),
  };
}

/** Safe public summary for storefront cards */
export function toStorePromotionSummary(promotion: PromotionDocument) {
  const data = promotion.data ?? {};
  const summary: Record<string, unknown> = {};

  if (promotion.type === "bundle") {
    if (typeof data.offerPrice === "number") summary.offerPrice = data.offerPrice;
    if (typeof data.originalPrice === "number") {
      summary.originalPrice = data.originalPrice;
    }
    if (Array.isArray(data.productIds)) {
      summary.productCount = data.productIds.length;
    }
  } else if (promotion.type === "product_discount") {
    if (typeof data.discountType === "string") {
      summary.discountType = data.discountType;
    }
    if (typeof data.value === "number") summary.value = data.value;
    if (Array.isArray(data.productIds)) {
      summary.productCount = data.productIds.length;
    }
  } else if (promotion.type === "coupon") {
    if (typeof data.discountType === "string") {
      summary.discountType = data.discountType;
    }
    if (typeof data.value === "number") summary.value = data.value;
    if (typeof data.minOrderAmount === "number") {
      summary.minOrderAmount = data.minOrderAmount;
    }
    if (typeof data.code === "string") summary.hasCode = true;
    if (typeof data.perUserLimit === "number") {
      summary.perUserLimit = data.perUserLimit;
    }
    if (typeof data.usageLimit === "number") {
      summary.usageLimit = data.usageLimit;
    }
  } else if (promotion.type === "free_shipping") {
    if (typeof data.minOrderAmount === "number") {
      summary.minOrderAmount = data.minOrderAmount;
    }
    if (typeof data.perUserLimit === "number") {
      summary.perUserLimit = data.perUserLimit;
    }
    if (typeof data.usageLimit === "number") {
      summary.usageLimit = data.usageLimit;
    }
  }

  return {
    id: promotion._id.toString(),
    title: promotion.title,
    type: promotion.type,
    status: promotion.status,
    image: promotion.image?.trim() ? promotion.image : null,
    description: promotion.description?.trim()
      ? promotion.description
      : null,
    startAt: promotion.startAt.toISOString(),
    endAt: promotion.endAt.toISOString(),
    priority: promotion.priority ?? 0,
    summary,
  };
}
