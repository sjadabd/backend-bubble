import type { Document } from "mongoose";
import { Tag, type TagDocument } from "./tag.model";

type TagDoc = TagDocument & Document;

export const TagRepository = {
  async findById(id: string) {
    return Tag.findById(id);
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return Tag.find({ _id: { $in: ids }, deletedAt: null }).lean();
  },

  async create(data: { name: string; color: string }) {
    return Tag.create({ ...data, deletedAt: null });
  },

  async findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Tag.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Tag.countDocuments(filter);
  },

  async save(tag: TagDoc) {
    return tag.save();
  },
};
