import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const brandSchema = new Schema(
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

brandSchema.index({ name: 1 });
brandSchema.index({ deletedAt: 1, status: 1, sortOrder: 1 });

export type BrandDocument = Omit<
  InferSchemaType<typeof brandSchema>,
  "deletedAt"
> & {
  _id: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Brand: Model<BrandDocument> =
  mongoose.models.Brand ??
  mongoose.model<BrandDocument>("Brand", brandSchema);

export function toBrandDto(brand: BrandDocument) {
  return {
    id: brand._id.toString(),
    name: brand.name,
    logo: brand.logo,
    status: brand.status as "active" | "inactive",
    sortOrder: brand.sortOrder ?? 0,
    deletedAt: brand.deletedAt ? brand.deletedAt.toISOString() : null,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}
