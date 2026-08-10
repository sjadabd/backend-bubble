import mongoose from "mongoose";
import { Customer, getTopCustomerByOrders } from "@modules/customers";
import {
  ORDER_STATUSES,
  StoreOrder,
  toStoreOrderDto,
  type OrderStatus,
  type StoreOrderDocument,
} from "@modules/orders";
import { Product } from "@modules/products/product.model";
import { Promotion } from "@modules/promotions/promotion.model";
import { UserRepository } from "@modules/users";
import type { ReportsOverviewQuery } from "./dashboard.validation";

const RANGE_DAYS: Record<ReportsOverviewQuery["range"], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeBounds(range: ReportsOverviewQuery["range"]) {
  const days = RANGE_DAYS[range];
  const end = new Date();
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (days - 1));
  return { start, end, days };
}

function emptyStatusCounts(): Array<{ status: OrderStatus; count: number }> {
  return ORDER_STATUSES.map((status) => ({ status, count: 0 }));
}

export async function getReportsOverview(query: ReportsOverviewQuery) {
  const { start, end, days } = rangeBounds(query.range);
  const periodMatch = { createdAt: { $gte: start, $lte: end } };
  const revenueMatch = {
    ...periodMatch,
    status: { $ne: "cancelled" },
  };

  const [
    kpiAgg,
    statusAgg,
    revenueAgg,
    topProductsAgg,
    recentOrders,
    pendingCount,
    customersPeriod,
    customersTotal,
    usersTotal,
    activeProducts,
    activePromotions,
    lowStockAgg,
    topCustomer,
  ] = await Promise.all([
    StoreOrder.aggregate<{
      ordersPeriod: number;
      revenuePeriod: number;
    }>([
      { $match: revenueMatch },
      {
        $group: {
          _id: null,
          ordersPeriod: { $sum: 1 },
          revenuePeriod: { $sum: "$total" },
        },
      },
    ]),
    StoreOrder.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: periodMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    StoreOrder.aggregate<{
      _id: { y: number; m: number; d: number };
      revenue: number;
      orders: number;
    }>([
      { $match: revenueMatch },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]),
    StoreOrder.aggregate<{
      _id: mongoose.Types.ObjectId;
      qty: number;
      revenue: number;
      title: string;
      image: string | null;
    }>([
      { $match: revenueMatch },
      { $unwind: "$lines" },
      {
        $match: {
          "lines.kind": "product",
          "lines.productId": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$lines.productId",
          qty: { $sum: "$lines.quantity" },
          revenue: { $sum: "$lines.lineTotal" },
          title: { $last: "$lines.title" },
          image: { $last: "$lines.image" },
        },
      },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: 5 },
    ]),
    StoreOrder.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .lean<StoreOrderDocument[]>(),
    StoreOrder.countDocuments({ status: "pending" }),
    Customer.countDocuments({
      googleId: { $exists: true, $nin: [null, ""] },
      createdAt: { $gte: start, $lte: end },
    }),
    Customer.countDocuments({
      googleId: { $exists: true, $nin: [null, ""] },
    }),
    UserRepository.count({
      role: { $ne: "super_admin" },
      deletedAt: null,
    }),
    Product.countDocuments({ status: "active", deletedAt: null }),
    Promotion.countDocuments({
      status: "active",
      deletedAt: null,
      startAt: { $lte: end },
      endAt: { $gte: start },
    }),
    Product.aggregate<{ count: number }>([
      { $match: { status: "active", deletedAt: null } },
      {
        $addFields: {
          remainingStock: {
            $sum: {
              $map: {
                input: { $ifNull: ["$variants", []] },
                as: "v",
                in: {
                  $max: [
                    0,
                    {
                      $subtract: [
                        { $ifNull: ["$$v.stock", 0] },
                        { $ifNull: ["$$v.reserved", 0] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      { $match: { remainingStock: { $lte: 10 } } },
      { $count: "count" },
    ]),
    getTopCustomerByOrders({ from: start, to: end }),
  ]);

  const ordersPeriod = kpiAgg[0]?.ordersPeriod ?? 0;
  const revenuePeriod = kpiAgg[0]?.revenuePeriod ?? 0;
  const avgOrderValue =
    ordersPeriod > 0 ? Math.round(revenuePeriod / ordersPeriod) : 0;

  const statusMap = new Map(
    statusAgg.map((row) => [row._id, row.count] as const),
  );
  const ordersByStatus = emptyStatusCounts().map((row) => ({
    status: row.status,
    count: statusMap.get(row.status) ?? 0,
  }));

  const revenueMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of revenueAgg) {
    const key = `${row._id.y}-${String(row._id.m).padStart(2, "0")}-${String(row._id.d).padStart(2, "0")}`;
    revenueMap.set(key, { revenue: row.revenue, orders: row.orders });
  }

  const revenueOverTime: Array<{
    date: string;
    revenue: number;
    orders: number;
  }> = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = formatDayKey(day);
    const hit = revenueMap.get(key);
    revenueOverTime.push({
      date: key,
      revenue: hit?.revenue ?? 0,
      orders: hit?.orders ?? 0,
    });
  }

  return {
    range: query.range,
    from: start.toISOString(),
    to: end.toISOString(),
    kpis: {
      revenuePeriod,
      ordersPeriod,
      avgOrderValue,
      pendingCount,
      customersPeriod,
      customersTotal,
      usersTotal,
      activeProducts,
      activePromotions,
      lowStockCount: lowStockAgg[0]?.count ?? 0,
    },
    ordersByStatus,
    revenueOverTime,
    topProducts: topProductsAgg.map((row) => ({
      productId: row._id.toString(),
      title: row.title,
      image: row.image?.trim() ? row.image : null,
      qty: row.qty,
      revenue: row.revenue,
    })),
    recentOrders: recentOrders.map((order) =>
      toStoreOrderDto(order as StoreOrderDocument),
    ),
    topCustomer,
  };
}
