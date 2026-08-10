import type { Document } from "mongoose";
import { StoreOrder, type StoreOrderDocument } from "./order.model";

type OrderDoc = StoreOrderDocument & Document;

export const OrderRepository = {
  async findById(id: string) {
    return StoreOrder.findById(id);
  },

  async findByIdLean(id: string) {
    return StoreOrder.findById(id).lean();
  },

  async findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return StoreOrder.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean();
  },

  async count(filter: Record<string, unknown>) {
    return StoreOrder.countDocuments(filter);
  },

  async save(order: OrderDoc) {
    return order.save();
  },
};
