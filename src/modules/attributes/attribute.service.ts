import mongoose from "mongoose";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { AttributeRepository } from "./attribute.repository";
import { toAttributeDto, type AttributeDocument } from "./attribute.model";
import type {
  AttributeValueInput,
  CreateAttributeInput,
  ListAttributesQuery,
  UpdateAttributeInput,
  UpdateAttributeValueInput,
} from "./attribute.validation";

export async function listAttributes(query: ListAttributesQuery) {
  const filter: Record<string, unknown> =
    query.status === "deleted"
      ? { deletedAt: { $ne: null } }
      : { deletedAt: null };

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.name = regex;
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    AttributeRepository.findMany(filter, { sort, skip, limit: query.limit }),
    AttributeRepository.count(filter),
  ]);

  return {
    items: items.map((item) => toAttributeDto(item as AttributeDocument)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createAttribute(input: CreateAttributeInput) {
  const attribute = await AttributeRepository.create(input);
  return toAttributeDto(attribute);
}

export async function updateAttribute(
  id: string,
  input: UpdateAttributeInput,
) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }
  if (input.name !== undefined) attribute.name = input.name;
  await AttributeRepository.save(attribute);
  return toAttributeDto(attribute);
}

export async function deleteAttribute(id: string) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }
  attribute.deletedAt = new Date();
  await AttributeRepository.save(attribute);
  return { id };
}

export async function restoreAttribute(id: string) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }
  if (!attribute.deletedAt) {
    throw new AppError(messages.attributeNotDeleted, statusCodes.BAD_REQUEST);
  }
  attribute.deletedAt = null;
  await AttributeRepository.save(attribute);
  return toAttributeDto(attribute);
}

export async function addAttributeValue(
  id: string,
  input: AttributeValueInput,
) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }

  attribute.values.push({
    _id: new mongoose.Types.ObjectId(),
    label: input.label,
    sortOrder: input.sortOrder ?? 0,
  });
  await AttributeRepository.save(attribute);
  return toAttributeDto(attribute);
}

export async function updateAttributeValue(
  id: string,
  valueId: string,
  input: UpdateAttributeValueInput,
) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }

  const value = attribute.values.find((item) => item._id.toString() === valueId);
  if (!value) {
    throw new AppError(messages.attributeValueNotFound, statusCodes.NOT_FOUND);
  }

  if (input.label !== undefined) value.label = input.label;
  if (input.sortOrder !== undefined) value.sortOrder = input.sortOrder;

  await AttributeRepository.save(attribute);
  return toAttributeDto(attribute);
}

export async function removeAttributeValue(id: string, valueId: string) {
  const attribute = await AttributeRepository.findById(id);
  if (!attribute) {
    throw new AppError(messages.attributeNotFound, statusCodes.NOT_FOUND);
  }

  const before = attribute.values.length;
  attribute.values = attribute.values.filter(
    (item) => item._id.toString() !== valueId,
  );
  if (attribute.values.length === before) {
    throw new AppError(messages.attributeValueNotFound, statusCodes.NOT_FOUND);
  }

  await AttributeRepository.save(attribute);
  return toAttributeDto(attribute);
}
