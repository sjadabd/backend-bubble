import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const tagSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      default: "#0084E4",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

tagSchema.index({ name: 1 });
tagSchema.index({ deletedAt: 1, createdAt: -1 });

export type TagDocument = Omit<
  InferSchemaType<typeof tagSchema>,
  "deletedAt"
> & {
  _id: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Tag: Model<TagDocument> =
  mongoose.models.Tag ?? mongoose.model<TagDocument>("Tag", tagSchema);

export function toTagDto(tag: TagDocument) {
  return {
    id: tag._id.toString(),
    name: tag.name,
    color: tag.color,
    deletedAt: tag.deletedAt ? tag.deletedAt.toISOString() : null,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}
