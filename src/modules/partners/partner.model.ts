import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const partnerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    logo: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

partnerSchema.index({ name: 1 });
partnerSchema.index({ deletedAt: 1, status: 1, sortOrder: 1 });

export type PartnerDocument = Omit<
  InferSchemaType<typeof partnerSchema>,
  "deletedAt"
> & {
  _id: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Partner: Model<PartnerDocument> =
  mongoose.models.Partner ??
  mongoose.model<PartnerDocument>("Partner", partnerSchema);

export function toPartnerDto(partner: PartnerDocument) {
  return {
    id: partner._id.toString(),
    name: partner.name,
    logo: partner.logo,
    status: partner.status as "active" | "inactive",
    sortOrder: partner.sortOrder ?? 0,
    deletedAt: partner.deletedAt ? partner.deletedAt.toISOString() : null,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}
