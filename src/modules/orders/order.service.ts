import mongoose from "mongoose";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { releasePromotionUsageForOrder } from "@modules/promotions";
import { Promotion } from "@modules/promotions/promotion.model";
import { OrderRepository } from "./order.repository";
import {
  orderEventFromDto,
  publishOrderRealtime,
} from "@shared/websocket/order-realtime";
import {
  StoreOrder,
  isOrderLocked,
  toStoreOrderDto,
  type OrderStatus,
  type StoreOrderDocument,
} from "./order.model";
import type {
  ListOrdersQuery,
  ReviewCancelRequestInput,
  UpdateOrderInput,
} from "./order.validation";

const OFFER_TYPE_LABEL: Record<string, string> = {
  coupon: "كوبون خصم",
  free_shipping: "شحن مجاني",
  product_discount: "خصم منتج",
  bundle: "باقة عرض",
};

async function loadAppliedOffers(order: ReturnType<typeof toStoreOrderDto>) {
  const ids = new Set<string>();
  if (order.promotionId) ids.add(order.promotionId);
  for (const id of order.appliedPromotionIds ?? []) {
    if (id) ids.add(id);
  }
  for (const line of order.lines ?? []) {
    if (line.promotionId) ids.add(line.promotionId);
  }

  if (ids.size === 0) return [];

  const objectIds = [...ids]
    .filter((id) => /^[a-f\d]{24}$/i.test(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) return [];

  const promotions = await Promotion.find({ _id: { $in: objectIds } })
    .select("title type data status")
    .lean();

  return promotions.map((promo) => {
    const data = (promo.data ?? {}) as Record<string, unknown>;
    const type = String(promo.type);
    return {
      id: promo._id.toString(),
      title: promo.title,
      type,
      typeLabel: OFFER_TYPE_LABEL[type] ?? type,
      code:
        typeof data.code === "string" && data.code.trim()
          ? String(data.code).toUpperCase()
          : null,
      discountType:
        typeof data.discountType === "string" ? data.discountType : null,
      value: typeof data.value === "number" ? data.value : null,
      minOrderAmount:
        typeof data.minOrderAmount === "number" ? data.minOrderAmount : null,
      offerPrice:
        typeof data.offerPrice === "number" ? data.offerPrice : null,
    };
  });
}

export async function listOrders(query: ListOrdersQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.cancelRequest === "pending") {
    filter["cancelRequest.status"] = "pending";
  }

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, unknown>[] = [
      { customerName: regex },
      { customerPhone: regex },
      { couponCode: regex },
    ];
    if (/^[a-f\d]{24}$/i.test(query.search)) {
      or.push({ _id: new mongoose.Types.ObjectId(query.search) });
    }
    filter.$or = or;
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    OrderRepository.findMany(filter, { sort, skip, limit: query.limit }),
    OrderRepository.count(filter),
  ]);

  return {
    items: items.map((item) =>
      toStoreOrderDto(item as unknown as StoreOrderDocument),
    ),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status ?? "",
    cancelRequest: query.cancelRequest ?? "",
  };
}

export async function getPendingCancelAlerts() {
  const items = await StoreOrder.find({
    "cancelRequest.status": "pending",
  })
    .sort({ "cancelRequest.requestedAt": -1, createdAt: -1 })
    .limit(20)
    .select(
      "customerName customerPhone total status cancelRequest createdAt",
    )
    .lean();

  const count = await StoreOrder.countDocuments({
    "cancelRequest.status": "pending",
  });

  return {
    count,
    items: items.map((order) => ({
      id: order._id.toString(),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      status: order.status,
      reason: order.cancelRequest?.reason?.trim()
        ? order.cancelRequest.reason
        : null,
      requestedAt: order.cancelRequest?.requestedAt
        ? new Date(order.cancelRequest.requestedAt).toISOString()
        : order.createdAt
          ? new Date(order.createdAt).toISOString()
          : null,
    })),
  };
}

export async function getOrderById(id: string) {
  const order = await OrderRepository.findByIdLean(id);
  if (!order) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }
  const dto = toStoreOrderDto(order as unknown as StoreOrderDocument);
  const appliedOffers = await loadAppliedOffers(dto);
  return {
    ...dto,
    appliedOffers,
    pricing: {
      subtotal: dto.subtotal,
      discount: dto.discount,
      total: dto.total,
      hasCoupon: Boolean(dto.couponCode),
      couponCode: dto.couponCode,
      freeShipping: dto.freeShipping,
      hasMoneyOffer:
        Boolean(dto.couponCode) ||
        dto.freeShipping ||
        dto.discount > 0 ||
        appliedOffers.length > 0 ||
        dto.lines.some((line) => line.kind === "bundle" || line.promotionId),
    },
  };
}

export async function updateOrder(
  id: string,
  input: UpdateOrderInput,
  actorId?: string | null,
) {
  const order = await OrderRepository.findById(id);
  if (!order) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }

  if (isOrderLocked(order.status)) {
    const tryingStatusChange =
      input.status !== undefined && input.status !== order.status;
    const tryingOrderFields =
      input.customerAddress !== undefined ||
      input.notes !== undefined ||
      Boolean(input.statusNote?.trim());
    if (tryingStatusChange || tryingOrderFields) {
      throw new AppError(
        "تم تسليم الطلب ولا يمكن تغيير حالته أو تعديل بياناته",
        statusCodes.BAD_REQUEST,
      );
    }
    if (input.adminNotes !== undefined) {
      order.adminNotes = input.adminNotes;
      await OrderRepository.save(order);
    }
    return toStoreOrderDto(order);
  }

  if (input.customerAddress !== undefined) {
    order.customerAddress = input.customerAddress;
  }
  if (input.notes !== undefined) {
    order.notes = input.notes;
  }
  if (input.adminNotes !== undefined) {
    order.adminNotes = input.adminNotes;
  }

  let statusChanged = false;
  if (input.status !== undefined && input.status !== order.status) {
    statusChanged = true;
    const nextStatus = input.status as OrderStatus;

    if (nextStatus === "cancelled") {
      const cancelNote = input.statusNote?.trim() || "";
      if (cancelNote.length < 3) {
        throw new AppError(
          messages.orderCancelReasonRequired,
          statusCodes.BAD_REQUEST,
        );
      }
      if (order.cancelRequest?.status === "pending") {
        throw new AppError(
          messages.orderCancelReviewPending,
          statusCodes.BAD_REQUEST,
        );
      }
      const actor = actorId ? new mongoose.Types.ObjectId(actorId) : null;
      const now = new Date();
      order.cancelRequest = {
        status: "approved",
        reason: order.cancelRequest?.reason?.trim() || "",
        requestedAt: order.cancelRequest?.requestedAt ?? null,
        reviewedAt: now,
        reviewedBy: actor,
        reviewNote: cancelNote,
      };
      order.status = nextStatus;
      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: nextStatus,
        note: cancelNote,
        changedBy: actor,
        changedAt: now,
      });
      await releasePromotionUsageForOrder(order._id.toString());
    } else {
      order.status = nextStatus;
      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: nextStatus,
        note: input.statusNote?.trim() || "",
        changedBy: actorId
          ? new mongoose.Types.ObjectId(actorId)
          : null,
        changedAt: new Date(),
      });
    }
  }

  await OrderRepository.save(order);
  const dto = toStoreOrderDto(order);
  if (statusChanged) {
    publishOrderRealtime(
      orderEventFromDto({ type: "order.updated", order: dto }),
    );
  }
  return dto;
}

export async function reviewCancelRequest(
  id: string,
  input: ReviewCancelRequestInput,
  actorId?: string | null,
) {
  const order = await OrderRepository.findById(id);
  if (!order) {
    throw new AppError(messages.orderNotFound, statusCodes.NOT_FOUND);
  }

  if (isOrderLocked(order.status)) {
    throw new AppError(
      "تم تسليم الطلب ولا يمكن مراجعة أو تنفيذ إلغاء عليه",
      statusCodes.BAD_REQUEST,
    );
  }

  if (order.cancelRequest?.status !== "pending") {
    throw new AppError(
      "لا يوجد طلب إلغاء بانتظار المراجعة",
      statusCodes.BAD_REQUEST,
    );
  }

  const actor = actorId ? new mongoose.Types.ObjectId(actorId) : null;
  const now = new Date();
  const reviewNote = input.reviewNote?.trim() || "";

  if (input.decision === "approve" && reviewNote.length < 3) {
    throw new AppError(
      messages.orderCancelReasonRequired,
      statusCodes.BAD_REQUEST,
    );
  }

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  const customerReason = order.cancelRequest.reason ?? "";
  const requestedAt = order.cancelRequest.requestedAt ?? now;

  if (input.decision === "approve") {
    order.status = "cancelled";
    order.cancelRequest = {
      status: "approved",
      reason: customerReason,
      requestedAt,
      reviewedAt: now,
      reviewedBy: actor,
      reviewNote,
    };
    order.statusHistory.push({
      status: "cancelled",
      note: reviewNote,
      changedBy: actor,
      changedAt: now,
    });
    await releasePromotionUsageForOrder(order._id.toString());
  } else {
    order.cancelRequest = {
      status: "rejected",
      reason: customerReason,
      requestedAt,
      reviewedAt: now,
      reviewedBy: actor,
      reviewNote,
    };
    order.statusHistory.push({
      status: order.status,
      note:
        reviewNote ||
        "تم رفض طلب الإلغاء — الطلب مستمر حسب مساره الحالي",
      changedBy: actor,
      changedAt: now,
    });
  }

  await OrderRepository.save(order);
  const dto = toStoreOrderDto(order);
  publishOrderRealtime(
    orderEventFromDto({ type: "order.cancel_reviewed", order: dto }),
  );
  return dto;
}
