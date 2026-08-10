import {
  createAdminUser,
  deleteAdminUser,
  listUsers,
  restoreAdminUser,
  updateAdminUser,
} from "../services";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from "../validators";
import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import type { AuthUser } from "../interfaces";

export const userController = {
  list: async (query: unknown) => {
    const input = parseBody(listUsersQuerySchema, query);
    const result = await listUsers(input);
    return {
      success: true,
      data: result,
    };
  },

  create: async (body: unknown, currentUser: AuthUser) => {
    const input = parseBody(createUserSchema, body);
    const user = await createAdminUser(input, currentUser.id);
    return {
      success: true,
      message: messages.userCreated,
      data: { user },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(userIdParamSchema, params);
    const input = parseBody(updateUserSchema, body);
    const user = await updateAdminUser(id, input);
    return {
      success: true,
      message: messages.userUpdated,
      data: { user },
    };
  },

  remove: async (params: unknown, currentUser: AuthUser) => {
    const { id } = parseBody(userIdParamSchema, params);
    const result = await deleteAdminUser(id, currentUser.id);
    return {
      success: true,
      message: messages.userDeleted,
      data: result,
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(userIdParamSchema, params);
    const user = await restoreAdminUser(id);
    return {
      success: true,
      message: messages.userRestored,
      data: { user },
    };
  },
};
