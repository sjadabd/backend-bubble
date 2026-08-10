import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const galleryItemSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const seoSchema = new Schema(
  {
    title: { type: String, trim: true, default: "", maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { _id: false },
);

const variantAttributeSchema = new Schema(
  {
    attributeId: { type: Schema.Types.ObjectId, ref: "Attribute", required: true },
    valueId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const packageSchema = new Schema(
  {
    weight: { type: Number, default: null },
    unit: { type: String, trim: true, default: "" },
    carton: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, maxlength: 80 },
    barcode: { type: String, trim: true, default: "", maxlength: 80 },
    image: { type: String, trim: true, default: "" },
    attributes: { type: [variantAttributeSchema], default: [] },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0, default: null },
    cost: { type: Number, min: 0, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    package: { type: packageSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    titleEn: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 220,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    categoryIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    tags: {
      type: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
      default: [],
    },
    gallery: {
      type: [galleryItemSchema],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    seo: {
      type: seoSchema,
      default: () => ({}),
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

productSchema.index({ brandId: 1 });
productSchema.index({ categoryIds: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ deletedAt: 1, status: 1, createdAt: -1 });
productSchema.index({ "variants.sku": 1 });
productSchema.index({ "variants.barcode": 1 });
productSchema.index({ "variants.status": 1 });

export type ProductVariant = {
  _id: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string | null;
  image?: string | null;
  attributes: Array<{
    attributeId: mongoose.Types.ObjectId;
    valueId: mongoose.Types.ObjectId;
  }>;
  price: number;
  oldPrice?: number | null;
  cost?: number | null;
  stock: number;
  reserved: number;
  package?: {
    weight?: number | null;
    unit?: string | null;
    carton?: string | null;
  } | null;
  status: "active" | "inactive";
};

export type ProductDocument = Omit<
  InferSchemaType<typeof productSchema>,
  "deletedAt" | "variants" | "gallery" | "seo" | "features" | "categoryIds" | "tags"
> & {
  _id: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  categoryIds: mongoose.Types.ObjectId[];
  tags: mongoose.Types.ObjectId[];
  gallery: Array<{ url: string; sortOrder: number }>;
  features: string[];
  seo: { title?: string; description?: string };
  variants: ProductVariant[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Product: Model<ProductDocument> =
  mongoose.models.Product ??
  mongoose.model<ProductDocument>("Product", productSchema);

export function toVariantDto(variant: ProductVariant) {
  return {
    id: variant._id.toString(),
    sku: variant.sku,
    barcode: variant.barcode?.trim() ? variant.barcode : null,
    image: variant.image?.trim() ? variant.image : null,
    attributes: (variant.attributes ?? []).map((item) => ({
      attributeId: item.attributeId.toString(),
      valueId: item.valueId.toString(),
    })),
    price: variant.price,
    oldPrice: variant.oldPrice ?? null,
    cost: variant.cost ?? null,
    stock: variant.stock ?? 0,
    reserved: variant.reserved ?? 0,
    package: {
      weight: variant.package?.weight ?? null,
      unit: variant.package?.unit?.trim() ? variant.package.unit : null,
      carton: variant.package?.carton?.trim() ? variant.package.carton : null,
    },
    status: variant.status,
  };
}

export function toProductDto(product: ProductDocument) {
  return {
    id: product._id.toString(),
    title: product.title,
    titleEn: product.titleEn?.trim() ? product.titleEn : null,
    slug: product.slug,
    description: product.description?.trim() ? product.description : null,
    brandId: product.brandId.toString(),
    categoryIds: (product.categoryIds ?? []).map((id) => id.toString()),
    tags: (product.tags ?? []).map((id) => id.toString()),
    gallery: (product.gallery ?? []).map((item) => ({
      url: item.url,
      sortOrder: item.sortOrder ?? 0,
    })),
    features: product.features ?? [],
    seo: {
      title: product.seo?.title ?? "",
      description: product.seo?.description ?? "",
    },
    variants: (product.variants ?? []).map(toVariantDto),
    featured: Boolean(product.featured),
    status: product.status as "active" | "inactive",
    deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductListItem(
  product: ProductDocument,
  brandName: string | null,
) {
  const firstImage =
    product.gallery?.[0]?.url ??
    product.variants?.find((v) => v.image)?.image ??
    null;

  const remainingStock = (product.variants ?? []).reduce((sum, variant) => {
    const stock = variant.stock ?? 0;
    const reserved = variant.reserved ?? 0;
    return sum + Math.max(0, stock - reserved);
  }, 0);

  return {
    id: product._id.toString(),
    title: product.title,
    image: firstImage,
    brandId: product.brandId.toString(),
    brandName,
    categoriesCount: product.categoryIds?.length ?? 0,
    variantsCount: product.variants?.length ?? 0,
    remainingStock,
    featured: Boolean(product.featured),
    status: product.status as "active" | "inactive",
    deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
    createdAt: product.createdAt.toISOString(),
  };
}
