import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { TagRepository } from "./tag.repository";
import { toTagDto, type TagDocument } from "./tag.model";
import type {
  CreateTagInput,
  UpdateTagInput,
  ListTagsQuery,
} from "./tag.validation";

export async function listTags(query: ListTagsQuery) {
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
    TagRepository.findMany(filter, { sort, skip, limit: query.limit }),
    TagRepository.count(filter),
  ]);

  return {
    items: items.map((item) => toTagDto(item as TagDocument)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createTag(input: CreateTagInput) {
  const tag = await TagRepository.create(input);
  return toTagDto(tag);
}

export async function updateTag(id: string, input: UpdateTagInput) {
  const tag = await TagRepository.findById(id);
  if (!tag) {
    throw new AppError(messages.tagNotFound, statusCodes.NOT_FOUND);
  }
  if (input.name !== undefined) tag.name = input.name;
  if (input.color !== undefined) tag.color = input.color;
  await TagRepository.save(tag);
  return toTagDto(tag);
}

export async function deleteTag(id: string) {
  const tag = await TagRepository.findById(id);
  if (!tag) {
    throw new AppError(messages.tagNotFound, statusCodes.NOT_FOUND);
  }
  tag.deletedAt = new Date();
  await TagRepository.save(tag);
  return { id };
}

export async function restoreTag(id: string) {
  const tag = await TagRepository.findById(id);
  if (!tag) {
    throw new AppError(messages.tagNotFound, statusCodes.NOT_FOUND);
  }
  if (!tag.deletedAt) {
    throw new AppError(messages.tagNotDeleted, statusCodes.BAD_REQUEST);
  }
  tag.deletedAt = null;
  await TagRepository.save(tag);
  return toTagDto(tag);
}
