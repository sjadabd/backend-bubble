import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const attributeValueSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const attributeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    values: {
      type: [attributeValueSchema],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

attributeSchema.index({ name: 1 });
attributeSchema.index({ deletedAt: 1, createdAt: -1 });

export type AttributeDocument = Omit<
  InferSchemaType<typeof attributeSchema>,
  "deletedAt" | "values"
> & {
  _id: mongoose.Types.ObjectId;
  values: Array<{
    _id: mongoose.Types.ObjectId;
    label: string;
    sortOrder: number;
  }>;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Attribute: Model<AttributeDocument> =
  mongoose.models.Attribute ??
  mongoose.model<AttributeDocument>("Attribute", attributeSchema);

export function toAttributeDto(attribute: AttributeDocument) {
  return {
    id: attribute._id.toString(),
    name: attribute.name,
    values: (attribute.values ?? []).map((value) => ({
      id: value._id.toString(),
      label: value.label,
      sortOrder: value.sortOrder ?? 0,
    })),
    deletedAt: attribute.deletedAt ? attribute.deletedAt.toISOString() : null,
    createdAt: attribute.createdAt.toISOString(),
    updatedAt: attribute.updatedAt.toISOString(),
  };
}
