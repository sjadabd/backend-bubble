import type { Document } from "mongoose";
import { Category, type CategoryDocument } from "../category.model";

export type CreateCategoryData = {
  title: string;
  logo: string;
  description?: string;
  isActive?: boolean;
  deletedAt?: Date | null;
  createdBy?: string;
};

type CategoryDoc = CategoryDocument & Document;

export const CategoryRepository = {
  async findById(id: string) {
    return Category.findById(id);
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return Category.find({ _id: { $in: ids } }).lean();
  },

  async create(data: CreateCategoryData) {
    return Category.create(data);
  },

  async findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Category.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit);
  },

  async count(filter: Record<string, unknown>) {
    return Category.countDocuments(filter);
  },

  async save(category: CategoryDoc) {
    return category.save();
  },
};
