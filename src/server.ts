import "./instrument";
import { app } from "./app";
import { env } from "@config/env";
import { connectDatabase } from "@database/connection";
import { logger } from "@config/logger";
import { bindOrderRealtimeServer } from "@shared/websocket/order-realtime";

async function bootstrap() {
  try {
    await connectDatabase();
  } catch (error) {
    logger.warn("db_connect_failed", {
      error: error instanceof Error ? error.message : String(error),
      note: "API will still start",
    });
  }

  app.listen(
    {
      port: env.port,
      // Allow multipart image uploads up to ~10MB (admin /uploads)
      maxRequestBodySize: 10 * 1024 * 1024,
    },
    (server) => {
      bindOrderRealtimeServer(
        server as Parameters<typeof bindOrderRealtimeServer>[0],
      );
    },
  );

  // Fallback if listen callback signature differs
  if (app.server) {
    bindOrderRealtimeServer(
      app.server as Parameters<typeof bindOrderRealtimeServer>[0],
    );
  }

  logger.info("server_started", {
    host: app.server?.hostname,
    port: app.server?.port,
    env: env.nodeEnv,
  });
}

bootstrap();
