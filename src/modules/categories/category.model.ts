import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const categorySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    logo: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

categorySchema.index({ title: 1 });
categorySchema.index({ deletedAt: 1, isActive: 1, createdAt: -1 });

export type CategoryDocument = Omit<
  InferSchemaType<typeof categorySchema>,
  "deletedAt" | "createdBy" | "description"
> & {
  _id: mongoose.Types.ObjectId;
  description?: string | null;
  deletedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Category: Model<CategoryDocument> =
  mongoose.models.Category ??
  mongoose.model<CategoryDocument>("Category", categorySchema);
