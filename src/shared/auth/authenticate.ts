import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import type { AuthUser } from "@shared/types";
import { getUserLoader } from "./user-loader";

type JwtVerifier = { verify: (token?: string) => Promise<unknown> };

/**
 * authenticate — Bearer JWT → load user once → return AuthUser
 */
export async function authenticate(
  jwt: JwtVerifier,
  request: Request,
): Promise<AuthUser> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }

  const token = header.slice(7);
  const payload = await jwt.verify(token);

  if (!payload || typeof payload !== "object" || !("sub" in payload)) {
    throw new AppError(messages.unauthorized, statusCodes.UNAUTHORIZED);
  }

  const user = await getUserLoader()(String(payload.sub));

  if (!user.isActive) {
    throw new AppError(messages.accountDisabled, statusCodes.FORBIDDEN);
  }

  return user;
}
