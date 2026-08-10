import {
  bootstrapSuperAdmin,
  hasSuperAdmin,
  loginUser,
} from "../services";
import { bootstrapSchema, loginSchema } from "../validators";
import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import type { AuthUser } from "@shared/types";

export const authController = {
  status: async () => ({
    success: true,
    data: {
      hasSuperAdmin: await hasSuperAdmin(),
    },
  }),

  bootstrap: async (body: unknown) => {
    const input = parseBody(bootstrapSchema, body);
    const user = await bootstrapSuperAdmin(input);
    return {
      success: true,
      message: messages.superAdminCreated,
      data: { user },
    };
  },

  login: async (
    body: unknown,
    signToken: (payload: { sub: string; role: string }) => Promise<string>,
  ) => {
    const input = parseBody(loginSchema, body);
    const user = await loginUser(input);
    const token = await signToken({ sub: user.id, role: user.role });

    return {
      success: true,
      message: messages.loggedIn,
      data: { token, user },
    };
  },

  /** Uses ctx.user from authenticate pipeline — no second DB read */
  me: async (user: AuthUser) => ({
    success: true,
    data: { user },
  }),
};
