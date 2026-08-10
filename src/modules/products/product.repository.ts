import type { Document } from "mongoose";
import { Product, type ProductDocument } from "./product.model";

type ProductDoc = ProductDocument & Document;

const listProjection = {
  title: 1,
  titleEn: 1,
  slug: 1,
  brandId: 1,
  categoryIds: 1,
  gallery: 1,
  variants: 1,
  featured: 1,
  status: 1,
  deletedAt: 1,
  createdAt: 1,
} as const;

export const ProductRepository = {
  async findById(id: string) {
    return Product.findById(id);
  },

  async findByIdLean(id: string) {
    return Product.findById(id).lean();
  },

  async findBySlug(slug: string, excludeId?: string) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    return Product.findOne(filter).select("_id").lean();
  },

  async findByVariantSku(sku: string, excludeProductId?: string) {
    const filter: Record<string, unknown> = { "variants.sku": sku };
    if (excludeProductId) filter._id = { $ne: excludeProductId };
    return Product.findOne(filter).select("_id").lean();
  },

  async create(data: Record<string, unknown>) {
    return Product.create(data);
  },

  async findManyLean(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Product.find(filter)
      .select(listProjection)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Product.countDocuments(filter);
  },

  /** Store catalog with computed min price for sorting + pagination */
  async findStoreCatalog(
    filter: Record<string, unknown>,
    options: {
      sort: "newest" | "price_asc" | "price_desc" | "popular";
      skip: number;
      limit: number;
    },
  ) {
    const sortStage: Record<string, 1 | -1> =
      options.sort === "price_asc"
        ? { storeMinPrice: 1, createdAt: -1 }
        : options.sort === "price_desc"
          ? { storeMinPrice: -1, createdAt: -1 }
          : options.sort === "popular"
            ? { featured: -1, createdAt: -1 }
            : { createdAt: -1 };

    const [result] = await Product.aggregate<{
      items: ProductDocument[];
      total: Array<{ count: number }>;
    }>([
      { $match: filter },
      {
        $addFields: {
          storeMinPrice: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$variants", []] },
                    as: "v",
                    cond: { $ne: ["$$v.status", "inactive"] },
                  },
                },
                as: "av",
                in: "$$av.price",
              },
            },
          },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          items: [
            { $skip: options.skip },
            { $limit: options.limit },
            { $project: { ...listProjection, storeMinPrice: 1 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  },

  async save(product: ProductDoc) {
    return product.save();
  },
};
