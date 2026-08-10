import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { WebsiteRepository } from "./website.repository";
import {
  toWebsiteSectionDto,
  toWebsiteSectionListItem,
  type WebsiteSectionDocument,
  type WebsiteSectionType,
} from "./website.model";
import type {
  CreateWebsiteSectionInput,
  ListWebsiteSectionsQuery,
  UpdateWebsiteSectionInput,
} from "./website.validation";
import { sectionDataByType } from "./website.validation";

function statusFilter(status: ListWebsiteSectionsQuery["status"]) {
  if (status === "active") return { status: "active", deletedAt: null };
  if (status === "inactive") return { status: "inactive", deletedAt: null };
  return { deletedAt: { $ne: null } };
}

function assertDateRange(startAt: Date | null, endAt: Date | null) {
  if (startAt && endAt && startAt >= endAt) {
    throw new AppError(messages.websiteDatesInvalid, statusCodes.BAD_REQUEST);
  }
}

function normalizeData(type: WebsiteSectionType, raw: Record<string, unknown>) {
  if (type === "hero") {
    const parsed = sectionDataByType.hero.parse(raw);
    const buttons = (parsed.buttons ?? [])
      .filter((button) => button.label.trim() && button.url.trim())
      .slice(0, 2)
      .map((button) => ({
        label: button.label.trim(),
        url: button.url.trim(),
        style: button.style,
      }));

    return {
      ...parsed,
      title: parsed.title?.trim() ?? "",
      subtitle: parsed.subtitle?.trim() ?? "",
      description: parsed.description?.trim() ?? "",
      image: parsed.backgroundType === "image" ? parsed.image.trim() : "",
      mobileImage: parsed.mobileImage?.trim() ?? "",
      video: parsed.backgroundType === "video" ? parsed.video.trim() : "",
      backgroundColor:
        parsed.backgroundType === "color" ? parsed.backgroundColor.trim() : "",
      buttons,
    };
  }

  return sectionDataByType[type].parse(raw) as Record<string, unknown>;
}

export async function listWebsiteSections(query: ListWebsiteSectionsQuery) {
  const filter: Record<string, unknown> = statusFilter(query.status);

  if (query.sitePage) filter.page = query.sitePage;
  if (query.type) filter.type = query.type;

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
    WebsiteRepository.findManyLean(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    WebsiteRepository.count(filter),
  ]);

  return {
    items: items.map((item) =>
      toWebsiteSectionListItem(item as WebsiteSectionDocument),
    ),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
    sitePage: query.sitePage ?? "",
    type: query.type ?? "",
  };
}

export async function getWebsiteSection(id: string) {
  const section = await WebsiteRepository.findByIdLean(id);
  if (!section) {
    throw new AppError(messages.websiteSectionNotFound, statusCodes.NOT_FOUND);
  }
  return toWebsiteSectionDto(section as WebsiteSectionDocument);
}

export async function createWebsiteSection(input: CreateWebsiteSectionInput) {
  assertDateRange(input.startAt ?? null, input.endAt ?? null);
  const data = normalizeData(input.type, input.data);

  const section = await WebsiteRepository.create({
    name: input.name,
    page: input.page,
    type: input.type,
    status: input.status,
    sortOrder: input.sortOrder ?? 0,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    data,
  });

  return toWebsiteSectionDto(section);
}

export async function updateWebsiteSection(
  id: string,
  input: UpdateWebsiteSectionInput,
) {
  const section = await WebsiteRepository.findById(id);
  if (!section) {
    throw new AppError(messages.websiteSectionNotFound, statusCodes.NOT_FOUND);
  }

  if (input.name !== undefined) section.name = input.name;
  if (input.status !== undefined) section.status = input.status;
  if (input.sortOrder !== undefined) section.sortOrder = input.sortOrder;
  if (input.startAt !== undefined) section.startAt = input.startAt;
  if (input.endAt !== undefined) section.endAt = input.endAt;

  assertDateRange(section.startAt ?? null, section.endAt ?? null);

  if (input.data !== undefined) {
    section.data = normalizeData(section.type, input.data);
  }

  await WebsiteRepository.save(section);
  return toWebsiteSectionDto(section);
}

export async function deleteWebsiteSection(id: string) {
  const section = await WebsiteRepository.findById(id);
  if (!section) {
    throw new AppError(messages.websiteSectionNotFound, statusCodes.NOT_FOUND);
  }
  section.deletedAt = new Date();
  section.status = "inactive";
  await WebsiteRepository.save(section);
  return { id };
}

export async function restoreWebsiteSection(id: string) {
  const section = await WebsiteRepository.findById(id);
  if (!section) {
    throw new AppError(messages.websiteSectionNotFound, statusCodes.NOT_FOUND);
  }
  if (!section.deletedAt) {
    throw new AppError(
      messages.websiteSectionNotDeleted,
      statusCodes.BAD_REQUEST,
    );
  }
  section.deletedAt = null;
  section.status = "active";
  await WebsiteRepository.save(section);
  return toWebsiteSectionDto(section);
}
