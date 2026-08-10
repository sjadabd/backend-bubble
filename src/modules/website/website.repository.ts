import type { Document } from "mongoose";
import { WebsiteSection, type WebsiteSectionDocument } from "./website.model";

type WebsiteSectionDoc = WebsiteSectionDocument & Document;

const listProjection = {
  name: 1,
  page: 1,
  type: 1,
  status: 1,
  sortOrder: 1,
  startAt: 1,
  endAt: 1,
  data: 1,
  deletedAt: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

export const WebsiteRepository = {
  async findById(id: string) {
    return WebsiteSection.findById(id);
  },

  async findByIdLean(id: string) {
    return WebsiteSection.findById(id).lean();
  },

  async create(data: Record<string, unknown>) {
    return WebsiteSection.create({
      ...data,
      deletedAt: null,
    });
  },

  async findManyLean(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return WebsiteSection.find(filter)
      .select(listProjection)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return WebsiteSection.countDocuments(filter);
  },

  async save(section: WebsiteSectionDoc) {
    return section.save();
  },
};
