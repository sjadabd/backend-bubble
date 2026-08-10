import { env } from "@config/env";

export const databaseConfig = {
  uri: env.mongodbUri,
} as const;
