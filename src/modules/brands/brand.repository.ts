import type { Document } from "mongoose";
import { Brand, type BrandDocument } from "./brand.model";

type BrandDoc = BrandDocument & Document;

export const BrandRepository = {
  async findById(id: string) {
    return Brand.findById(id);
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return Brand.find({ _id: { $in: ids } }).lean();
  },

  async create(data: {
    name: string;
    logo: string;
    status?: string;
    sortOrder?: number;
  }) {
    return Brand.create({
      ...data,
      deletedAt: null,
    });
  },

  async findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Brand.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Brand.countDocuments(filter);
  },

  async save(brand: BrandDoc) {
    return brand.save();
  },
};
