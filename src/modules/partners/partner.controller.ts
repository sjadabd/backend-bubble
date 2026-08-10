import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  createPartner,
  deletePartner,
  listPartners,
  restorePartner,
  updatePartner,
} from "./partner.service";
import {
  partnerIdParamSchema,
  createPartnerSchema,
  listPartnersQuerySchema,
  updatePartnerSchema,
} from "./partner.validation";

export const partnerController = {
  list: async (query: unknown) => {
    const input = parseBody(listPartnersQuerySchema, query);
    return { success: true, data: await listPartners(input) };
  },

  create: async (body: unknown) => {
    const input = parseBody(createPartnerSchema, body);
    const partner = await createPartner(input);
    return {
      success: true,
      message: messages.partnerCreated,
      data: { partner },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(partnerIdParamSchema, params);
    const input = parseBody(updatePartnerSchema, body);
    const partner = await updatePartner(id, input);
    return {
      success: true,
      message: messages.partnerUpdated,
      data: { partner },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(partnerIdParamSchema, params);
    const result = await deletePartner(id);
    return {
      success: true,
      message: messages.partnerDeleted,
      data: result,
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(partnerIdParamSchema, params);
    const partner = await restorePartner(id);
    return {
      success: true,
      message: messages.partnerRestored,
      data: { partner },
    };
  },
};
