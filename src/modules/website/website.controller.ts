import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  createWebsiteSection,
  deleteWebsiteSection,
  getWebsiteSection,
  listWebsiteSections,
  restoreWebsiteSection,
  updateWebsiteSection,
} from "./website.service";
import {
  createWebsiteSectionSchema,
  listWebsiteSectionsQuerySchema,
  updateWebsiteSectionSchema,
  websiteSectionIdParamSchema,
} from "./website.validation";

export const websiteController = {
  list: async (query: unknown) => {
    const input = parseBody(listWebsiteSectionsQuerySchema, query);
    return { success: true, data: await listWebsiteSections(input) };
  },

  get: async (params: unknown) => {
    const { id } = parseBody(websiteSectionIdParamSchema, params);
    const section = await getWebsiteSection(id);
    return { success: true, data: { section } };
  },

  create: async (body: unknown) => {
    const input = parseBody(createWebsiteSectionSchema, body);
    const section = await createWebsiteSection(input);
    return {
      success: true,
      message: messages.websiteSectionCreated,
      data: { section },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(websiteSectionIdParamSchema, params);
    const input = parseBody(updateWebsiteSectionSchema, body);
    const section = await updateWebsiteSection(id, input);
    return {
      success: true,
      message: messages.websiteSectionUpdated,
      data: { section },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(websiteSectionIdParamSchema, params);
    return {
      success: true,
      message: messages.websiteSectionDeleted,
      data: await deleteWebsiteSection(id),
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(websiteSectionIdParamSchema, params);
    const section = await restoreWebsiteSection(id);
    return {
      success: true,
      message: messages.websiteSectionRestored,
      data: { section },
    };
  },
};
