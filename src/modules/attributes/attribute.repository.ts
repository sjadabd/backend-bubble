import type { Document } from "mongoose";
import { Attribute, type AttributeDocument } from "./attribute.model";

type AttributeDoc = AttributeDocument & Document;

export const AttributeRepository = {
  async findById(id: string) {
    return Attribute.findById(id);
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return Attribute.find({ _id: { $in: ids }, deletedAt: null }).lean();
  },

  async create(data: {
    name: string;
    values?: Array<{ label: string; sortOrder?: number }>;
  }) {
    return Attribute.create({
      name: data.name,
      values: data.values ?? [],
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
    return Attribute.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Attribute.countDocuments(filter);
  },

  async save(attribute: AttributeDoc) {
    return attribute.save();
  },
};
