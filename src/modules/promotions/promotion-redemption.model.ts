import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const promotionRedemptionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "StoreOrder",
      required: true,
    },
    kind: {
      type: String,
      enum: ["coupon", "free_shipping", "bundle", "product_discount"],
      required: true,
    },
  },
  { timestamps: true },
);

promotionRedemptionSchema.index({ customerId: 1, promotionId: 1 });

export type PromotionRedemptionDocument = InferSchemaType<
  typeof promotionRedemptionSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PromotionRedemption: Model<PromotionRedemptionDocument> =
  mongoose.models.PromotionRedemption ??
  mongoose.model<PromotionRedemptionDocument>(
    "PromotionRedemption",
    promotionRedemptionSchema,
  );
