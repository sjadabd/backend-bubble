import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  createTag,
  deleteTag,
  listTags,
  restoreTag,
  updateTag,
} from "./tag.service";
import {
  createTagSchema,
  listTagsQuerySchema,
  tagIdParamSchema,
  updateTagSchema,
} from "./tag.validation";

export const tagController = {
  list: async (query: unknown) => {
    const input = parseBody(listTagsQuerySchema, query);
    return { success: true, data: await listTags(input) };
  },

  create: async (body: unknown) => {
    const input = parseBody(createTagSchema, body);
    const tag = await createTag(input);
    return { success: true, message: messages.tagCreated, data: { tag } };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(tagIdParamSchema, params);
    const input = parseBody(updateTagSchema, body);
    const tag = await updateTag(id, input);
    return { success: true, message: messages.tagUpdated, data: { tag } };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(tagIdParamSchema, params);
    return {
      success: true,
      message: messages.tagDeleted,
      data: await deleteTag(id),
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(tagIdParamSchema, params);
    const tag = await restoreTag(id);
    return { success: true, message: messages.tagRestored, data: { tag } };
  },
};
