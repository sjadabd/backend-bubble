export const ORDER_ADMIN_TOPIC = "admin:orders";

export function customerOrderTopic(customerId: string) {
  return `customer:${customerId}`;
}

export type OrderRealtimeEventType =
  | "order.created"
  | "order.updated"
  | "order.cancel_requested"
  | "order.cancel_reviewed";

export type OrderRealtimeEvent = {
  type: OrderRealtimeEventType;
  orderId: string;
  status: string;
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  total: number;
  cancelRequestStatus?: string | null;
  reason?: string | null;
  at: string;
};

type PublishServer = {
  publish: (
    topic: string,
    data: string | ArrayBufferView | ArrayBuffer,
    compress?: boolean,
  ) => number | void;
};

let serverRef: PublishServer | null = null;

export function bindOrderRealtimeServer(server: PublishServer | null | undefined) {
  serverRef = server ?? null;
}

export function publishOrderRealtime(event: OrderRealtimeEvent) {
  if (!serverRef) return;
  const payload = JSON.stringify(event);
  try {
    serverRef.publish(ORDER_ADMIN_TOPIC, payload);
  } catch {
    /* no admin subscribers */
  }
  if (event.customerId) {
    try {
      serverRef.publish(customerOrderTopic(event.customerId), payload);
    } catch {
      /* no customer subscribers */
    }
  }
}

export function orderEventFromDto(input: {
  type: OrderRealtimeEventType;
  order: {
    id: string;
    status: string;
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    total: number;
    cancelRequest?: { status?: string; reason?: string | null } | null;
  };
}): OrderRealtimeEvent {
  return {
    type: input.type,
    orderId: input.order.id,
    status: input.order.status,
    customerId: input.order.customerId ?? null,
    customerName: input.order.customerName,
    customerPhone: input.order.customerPhone ?? undefined,
    total: input.order.total,
    cancelRequestStatus: input.order.cancelRequest?.status ?? null,
    reason: input.order.cancelRequest?.reason ?? null,
    at: new Date().toISOString(),
  };
}
