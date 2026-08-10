import type { Document } from "mongoose";
import { Partner, type PartnerDocument } from "./partner.model";

type PartnerDoc = PartnerDocument & Document;

export const PartnerRepository = {
  async findById(id: string) {
    return Partner.findById(id);
  },

  async create(data: {
    name: string;
    logo: string;
    status?: string;
    sortOrder?: number;
  }) {
    return Partner.create({
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
    return Partner.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return Partner.countDocuments(filter);
  },

  async save(partner: PartnerDoc) {
    return partner.save();
  },
};
