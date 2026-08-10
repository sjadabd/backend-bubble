import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CANCEL_REQUEST_STATUSES = [
  "none",
  "pending",
  "approved",
  "rejected",
] as const;

export type CancelRequestStatus = (typeof CANCEL_REQUEST_STATUSES)[number];

/** Statuses where the customer may still ask to cancel */
export const CANCELABLE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
];

/** After delivery the order is immutable (no status / cancel changes) */
export const LOCKED_ORDER_STATUSES: OrderStatus[] = ["delivered"];

export function isOrderLocked(status: OrderStatus | string) {
  return LOCKED_ORDER_STATUSES.includes(status as OrderStatus);
}

const orderLineSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["product", "bundle"],
      default: "product",
    },
    productId: { type: Schema.Types.ObjectId, default: null },
    promotionId: { type: Schema.Types.ObjectId, default: null },
    title: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    productIds: {
      type: [{ type: Schema.Types.ObjectId }],
      default: [],
    },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cancelRequestSchema = new Schema(
  {
    status: {
      type: String,
      enum: CANCEL_REQUEST_STATUSES,
      default: "none",
    },
    reason: { type: String, default: "", trim: true, maxlength: 500 },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const storeOrderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerPhone: { type: String, required: true, trim: true, maxlength: 30 },
    customerAddress: { type: String, default: "", trim: true, maxlength: 500 },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
    adminNotes: { type: String, default: "", trim: true, maxlength: 1000 },
    lines: { type: [orderLineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String, default: null, trim: true },
    promotionId: { type: Schema.Types.ObjectId, default: null },
    freeShipping: { type: Boolean, default: false },
    appliedPromotionIds: {
      type: [{ type: Schema.Types.ObjectId }],
      default: [],
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    cancelRequest: {
      type: cancelRequestSchema,
      default: () => ({ status: "none" }),
    },
  },
  { timestamps: true },
);

storeOrderSchema.index({ status: 1, createdAt: -1 });
storeOrderSchema.index({ customerPhone: 1 });
storeOrderSchema.index({ customerId: 1, createdAt: -1 });
storeOrderSchema.index({ "cancelRequest.status": 1, createdAt: -1 });

export type StoreOrderDocument = Omit<
  InferSchemaType<typeof storeOrderSchema>,
  "lines" | "status" | "statusHistory" | "cancelRequest"
> & {
  _id: mongoose.Types.ObjectId;
  status: OrderStatus;
  lines: Array<{
    kind: "product" | "bundle";
    productId?: mongoose.Types.ObjectId | null;
    promotionId?: mongoose.Types.ObjectId | null;
    title: string;
    image?: string | null;
    unitPrice: number;
    quantity: number;
    productIds?: mongoose.Types.ObjectId[];
    lineTotal: number;
  }>;
  statusHistory: Array<{
    status: OrderStatus;
    note?: string;
    changedBy?: mongoose.Types.ObjectId | null;
    changedAt: Date;
  }>;
  cancelRequest?: {
    status: CancelRequestStatus;
    reason?: string;
    requestedAt?: Date | null;
    reviewedAt?: Date | null;
    reviewedBy?: mongoose.Types.ObjectId | null;
    reviewNote?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

function toCancelRequestDto(order: StoreOrderDocument) {
  const req = order.cancelRequest;
  if (!req || req.status === "none") {
    return {
      status: "none" as const,
      reason: null,
      requestedAt: null,
      reviewedAt: null,
      reviewNote: null,
      canRequest:
        !isOrderLocked(order.status) &&
        CANCELABLE_ORDER_STATUSES.includes(order.status),
    };
  }
  return {
    status: req.status,
    reason: req.reason?.trim() ? req.reason : null,
    requestedAt: req.requestedAt
      ? new Date(req.requestedAt).toISOString()
      : null,
    reviewedAt: req.reviewedAt
      ? new Date(req.reviewedAt).toISOString()
      : null,
    reviewNote: req.reviewNote?.trim() ? req.reviewNote : null,
    canRequest:
      !isOrderLocked(order.status) &&
      req.status !== "pending" &&
      CANCELABLE_ORDER_STATUSES.includes(order.status),
  };
}

export const StoreOrder: Model<StoreOrderDocument> =
  mongoose.models.StoreOrder ??
  mongoose.model<StoreOrderDocument>("StoreOrder", storeOrderSchema);

export function toStoreOrderDto(order: StoreOrderDocument) {
  const history = (order.statusHistory ?? []).map((entry) => ({
    status: entry.status,
    note: entry.note?.trim() ? entry.note : null,
    changedAt: new Date(entry.changedAt).toISOString(),
  }));

  return {
    id: order._id.toString(),
    customerId: order.customerId ? order.customerId.toString() : null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress || null,
    notes: order.notes || null,
    adminNotes: order.adminNotes || null,
    lines: (order.lines ?? []).map((line) => ({
      kind: line.kind,
      productId: line.productId ? line.productId.toString() : null,
      promotionId: line.promotionId ? line.promotionId.toString() : null,
      title: line.title,
      image: line.image ?? null,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      productIds: (line.productIds ?? []).map((id) => id.toString()),
      lineTotal: line.lineTotal,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    couponCode: order.couponCode ?? null,
    promotionId: order.promotionId ? order.promotionId.toString() : null,
    freeShipping: Boolean(order.freeShipping),
    appliedPromotionIds: (order.appliedPromotionIds ?? []).map((id) =>
      id.toString(),
    ),
    status: order.status,
    statusHistory: history,
    cancelRequest: toCancelRequestDto(order),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** Public customer-safe DTO (hides admin notes) */
export function toCustomerOrderDto(order: StoreOrderDocument) {
  const dto = toStoreOrderDto(order);
  const { adminNotes: _adminNotes, ...rest } = dto;
  return rest;
}
