import mongoose from "mongoose";
import { StoreOrder } from "@modules/orders/order.model";
import { CustomerRepository } from "./customer.repository";
import {
  toAdminCustomerDto,
  type CustomerDocument,
} from "./customer.model";
import type { ListCustomersQuery } from "./customer.validation";

/** Store customers always authenticate via Google (`googleId` required). */
const GOOGLE_CUSTOMER_FILTER = {
  googleId: { $exists: true, $nin: [null, ""] },
};

export type TopCustomerByOrders = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
};

export async function getTopCustomerByOrders(options?: {
  from?: Date;
  to?: Date;
}): Promise<TopCustomerByOrders | null> {
  const match: Record<string, unknown> = {
    customerId: { $ne: null },
    status: { $ne: "cancelled" },
  };
  if (options?.from || options?.to) {
    const createdAt: Record<string, Date> = {};
    if (options.from) createdAt.$gte = options.from;
    if (options.to) createdAt.$lte = options.to;
    match.createdAt = createdAt;
  }

  const [top] = await StoreOrder.aggregate<{
    _id: mongoose.Types.ObjectId;
    orderCount: number;
    totalSpent: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: "$customerId",
        orderCount: { $sum: 1 },
        totalSpent: { $sum: "$total" },
      },
    },
    { $sort: { orderCount: -1, totalSpent: -1 } },
    { $limit: 1 },
  ]);

  if (!top) return null;

  const customer = await CustomerRepository.findById(top._id.toString());
  if (
    !customer ||
    !(customer as CustomerDocument).googleId?.trim()
  ) {
    return null;
  }

  const dto = toAdminCustomerDto(customer as CustomerDocument);
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    avatar: dto.avatar,
    phone: dto.phone,
    orderCount: top.orderCount,
    totalSpent: top.totalSpent,
  };
}

export async function listGoogleCustomers(query: ListCustomersQuery) {
  const filter: Record<string, unknown> = { ...GOOGLE_CUSTOMER_FILTER };

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };
  const skip = (query.page - 1) * query.limit;

  const [items, total, topCustomer] = await Promise.all([
    CustomerRepository.findMany(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    CustomerRepository.count(filter),
    getTopCustomerByOrders(),
  ]);

  return {
    items: items.map((item) =>
      toAdminCustomerDto(item as CustomerDocument),
    ),
    topCustomer,
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}
