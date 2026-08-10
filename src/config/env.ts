import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, "../../.env") });

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

function readSecret(
  primary: string,
  options?: { legacy?: string; devFallback: string },
): string {
  const value = process.env[primary] ?? (options?.legacy ? process.env[options.legacy] : undefined);
  if (value && value.length >= 16) return value;
  if (isProd) {
    throw new Error(
      `[config] Missing or weak secret "${primary}". Set a strong value (min 16 chars) in production.`,
    );
  }
  return options?.devFallback ?? `dev-only-${primary.toLowerCase()}-min-16`;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv,
  isProd,
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018/bubble",
  corsOrigin: (process.env.CORS_ORIGIN ??
    "http://localhost:3000,http://localhost:3002")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),

  /** Access token signing — never reuse for encryption */
  jwtAccessSecret: readSecret("JWT_ACCESS_SECRET", {
    legacy: "JWT_SECRET",
    devFallback: "dev-jwt-access-secret-change-me",
  }),
  /** Reserved for refresh tokens */
  jwtRefreshSecret: readSecret("JWT_REFRESH_SECRET", {
    devFallback: "dev-jwt-refresh-secret-change-me",
  }),
  /** Field-level encryption (AES) — never reuse for JWT */
  fieldEncryptionKey: readSecret("FIELD_ENCRYPTION_KEY", {
    devFallback: "dev-field-encryption-key-change",
  }),
  /** Reserved for signed cookies */
  cookieSecret: readSecret("COOKIE_SECRET", {
    devFallback: "dev-cookie-secret-change-me-xx",
  }),
  /** Reserved for webhook / API signatures */
  apiSignatureSecret: readSecret("API_SIGNATURE_SECRET", {
    devFallback: "dev-api-signature-secret-change",
  }),

  /**
   * Required to call POST /auth/bootstrap.
   * In production bootstrap is disabled unless BOOTSTRAP_ENABLED=true.
   */
  adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY ?? "",
  bootstrapEnabled:
    process.env.BOOTSTRAP_ENABLED === "true" ||
    (!isProd && process.env.BOOTSTRAP_ENABLED !== "false"),

  /** Google OAuth client ID for storefront customer login */
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
} as const;
