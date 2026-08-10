import { parseBody } from "@shared/middleware/validation.middleware";
import { messages } from "@constants/messages";
import {
  addAttributeValue,
  createAttribute,
  deleteAttribute,
  listAttributes,
  removeAttributeValue,
  restoreAttribute,
  updateAttribute,
  updateAttributeValue,
} from "./attribute.service";
import {
  attributeIdParamSchema,
  attributeValueParamSchema,
  attributeValueSchema,
  createAttributeSchema,
  listAttributesQuerySchema,
  updateAttributeSchema,
  updateAttributeValueSchema,
} from "./attribute.validation";

export const attributeController = {
  list: async (query: unknown) => {
    const input = parseBody(listAttributesQuerySchema, query);
    return { success: true, data: await listAttributes(input) };
  },

  create: async (body: unknown) => {
    const input = parseBody(createAttributeSchema, body);
    const attribute = await createAttribute(input);
    return {
      success: true,
      message: messages.attributeCreated,
      data: { attribute },
    };
  },

  update: async (params: unknown, body: unknown) => {
    const { id } = parseBody(attributeIdParamSchema, params);
    const input = parseBody(updateAttributeSchema, body);
    const attribute = await updateAttribute(id, input);
    return {
      success: true,
      message: messages.attributeUpdated,
      data: { attribute },
    };
  },

  remove: async (params: unknown) => {
    const { id } = parseBody(attributeIdParamSchema, params);
    return {
      success: true,
      message: messages.attributeDeleted,
      data: await deleteAttribute(id),
    };
  },

  restore: async (params: unknown) => {
    const { id } = parseBody(attributeIdParamSchema, params);
    const attribute = await restoreAttribute(id);
    return {
      success: true,
      message: messages.attributeRestored,
      data: { attribute },
    };
  },

  addValue: async (params: unknown, body: unknown) => {
    const { id } = parseBody(attributeIdParamSchema, params);
    const input = parseBody(attributeValueSchema, body);
    const attribute = await addAttributeValue(id, input);
    return {
      success: true,
      message: messages.attributeValueAdded,
      data: { attribute },
    };
  },

  updateValue: async (params: unknown, body: unknown) => {
    const { id, valueId } = parseBody(attributeValueParamSchema, params);
    const input = parseBody(updateAttributeValueSchema, body);
    const attribute = await updateAttributeValue(id, valueId, input);
    return {
      success: true,
      message: messages.attributeValueUpdated,
      data: { attribute },
    };
  },

  removeValue: async (params: unknown) => {
    const { id, valueId } = parseBody(attributeValueParamSchema, params);
    const attribute = await removeAttributeValue(id, valueId);
    return {
      success: true,
      message: messages.attributeValueRemoved,
      data: { attribute },
    };
  },
};
