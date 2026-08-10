import { Elysia, t } from "elysia";
import { jwtPlugin } from "@shared/auth";
import { getUserById } from "@modules/users";
import { CustomerRepository } from "@modules/customers";
import {
  ORDER_ADMIN_TOPIC,
  customerOrderTopic,
} from "@shared/websocket/order-realtime";

type WsIdentity =
  | {
      role: "admin";
      userId: string;
      topic: typeof ORDER_ADMIN_TOPIC;
    }
  | {
      role: "customer";
      userId: string;
      topic: string;
    };

/**
 * Secured order realtime channel.
 * Connect: ws(s)://host/ws/orders?token=<JWT>
 * Admin JWT → admin:orders
 * Customer JWT (kind=customer) → customer:{id}
 */
export const orderWsRoutes = new Elysia({ name: "order-ws" })
  .use(jwtPlugin)
  .ws("/ws/orders", {
    query: t.Object({
      token: t.String({ minLength: 10 }),
    }),
    body: t.Object({
      type: t.Literal("ping"),
    }),
    async open(ws) {
      const token = ws.data.query.token;
      const payload = await ws.data.jwt.verify(token);
      if (!payload || typeof payload !== "object" || !("sub" in payload)) {
        ws.send(JSON.stringify({ type: "error", message: "unauthorized" }));
        ws.close();
        return;
      }

      const sub = String((payload as { sub: string }).sub);
      const kind = (payload as { kind?: string }).kind;

      let identity: WsIdentity | null = null;

      if (kind === "customer") {
        const customer = await CustomerRepository.findById(sub);
        if (!customer || !customer.isActive) {
          ws.send(JSON.stringify({ type: "error", message: "unauthorized" }));
          ws.close();
          return;
        }
        identity = {
          role: "customer",
          userId: sub,
          topic: customerOrderTopic(sub),
        };
      } else {
        try {
          const user = await getUserById(sub);
          if (
            !user.isActive ||
            (user.role !== "super_admin" &&
              !user.permissions.includes("orders.manage"))
          ) {
            ws.send(JSON.stringify({ type: "error", message: "forbidden" }));
            ws.close();
            return;
          }
          identity = {
            role: "admin",
            userId: sub,
            topic: ORDER_ADMIN_TOPIC,
          };
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "unauthorized" }));
          ws.close();
          return;
        }
      }

      (ws.data as { identity?: WsIdentity }).identity = identity;
      ws.subscribe(identity.topic);
      ws.send(
        JSON.stringify({
          type: "ready",
          role: identity.role,
          topic: identity.topic,
          at: new Date().toISOString(),
        }),
      );
    },
    message(ws, message) {
      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", at: new Date().toISOString() }));
      }
    },
    close(ws) {
      const identity = (ws.data as { identity?: WsIdentity }).identity;
      if (identity) {
        try {
          ws.unsubscribe(identity.topic);
        } catch {
          /* already closed */
        }
      }
    },
  });
