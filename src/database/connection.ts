import mongoose from "mongoose";
import { databaseConfig } from "@config/database";
import { logger } from "@config/logger";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(databaseConfig.uri);
  logger.info("db_connected", { uriHost: "configured" });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
