import { z } from "zod";
import { env } from "@config/env";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { parseBody } from "@shared/middleware/validation.middleware";
import {
  CustomerRepository,
  toCustomerDto,
  type StoreCustomer,
} from "@modules/customers";

const googleLoginSchema = z
  .object({
    idToken: z.string().trim().min(20).optional(),
    accessToken: z.string().trim().min(20).optional(),
  })
  .refine((data) => Boolean(data.idToken || data.accessToken), {
    message: messages.googleAuthFailed,
  });

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  error?: string;
};

async function profileFromIdToken(idToken: string) {
  if (!env.googleClientId) {
    throw new AppError(
      "تسجيل الدخول عبر Google غير مفعّل حالياً",
      statusCodes.BAD_REQUEST,
    );
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  const data = (await response.json()) as GoogleTokenInfo;

  if (!response.ok || data.error || !data.sub || !data.email) {
    throw new AppError(messages.googleAuthFailed, statusCodes.UNAUTHORIZED);
  }

  if (data.aud !== env.googleClientId) {
    throw new AppError(messages.googleAuthFailed, statusCodes.UNAUTHORIZED);
  }

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified) {
    throw new AppError(
      "يجب التحقق من البريد الإلكتروني في Google أولاً",
      statusCodes.FORBIDDEN,
    );
  }

  return {
    googleId: data.sub,
    email: data.email,
    name: data.name?.trim() || data.email.split("@")[0] || "عميل Bubble",
    avatar: data.picture ?? null,
  };
}

async function profileFromAccessToken(accessToken: string) {
  if (!env.googleClientId) {
    throw new AppError(
      "تسجيل الدخول عبر Google غير مفعّل حالياً",
      statusCodes.BAD_REQUEST,
    );
  }

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = (await response.json()) as GoogleUserInfo;

  if (!response.ok || data.error || !data.sub || !data.email) {
    throw new AppError(messages.googleAuthFailed, statusCodes.UNAUTHORIZED);
  }

  if (data.email_verified === false) {
    throw new AppError(
      "يجب التحقق من البريد الإلكتروني في Google أولاً",
      statusCodes.FORBIDDEN,
    );
  }

  return {
    googleId: data.sub,
    email: data.email,
    name: data.name?.trim() || data.email.split("@")[0] || "عميل Bubble",
    avatar: data.picture ?? null,
  };
}

export async function verifyGoogleIdToken(idToken: string) {
  return profileFromIdToken(idToken);
}

export async function loginWithGoogle(body: unknown) {
  const input = parseBody(googleLoginSchema, body);
  const profile = input.accessToken
    ? await profileFromAccessToken(input.accessToken)
    : await profileFromIdToken(input.idToken!);
  const customer = await CustomerRepository.upsertFromGoogle(profile);
  if (!customer.isActive) {
    throw new AppError(messages.accountDisabled, statusCodes.FORBIDDEN);
  }
  return toCustomerDto(customer);
}

export async function getCustomerFromToken(
  jwt: { verify: (token?: string) => Promise<unknown> },
  request: Request,
): Promise<StoreCustomer> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }

  const token = header.slice(7);
  const payload = await jwt.verify(token);
  if (
    !payload ||
    typeof payload !== "object" ||
    !("sub" in payload) ||
    !("kind" in payload) ||
    (payload as { kind?: string }).kind !== "customer"
  ) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }

  const customer = await CustomerRepository.findById(
    String((payload as { sub: string }).sub),
  );
  if (!customer || !customer.isActive) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }

  return toCustomerDto(customer);
}

export function requireCustomerOptional(
  jwt: { verify: (token?: string) => Promise<unknown> },
  request: Request,
): Promise<StoreCustomer | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return Promise.resolve(null);
  return getCustomerFromToken(jwt, request).catch(() => null);
}
