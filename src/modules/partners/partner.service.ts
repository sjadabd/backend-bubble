import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { PartnerRepository } from "./partner.repository";
import { toPartnerDto, type PartnerDocument } from "./partner.model";
import type {
  CreatePartnerInput,
  UpdatePartnerInput,
  ListPartnersQuery,
} from "./partner.validation";

function statusFilter(status: ListPartnersQuery["status"]) {
  if (status === "active") return { status: "active", deletedAt: null };
  if (status === "inactive") return { status: "inactive", deletedAt: null };
  return { deletedAt: { $ne: null } };
}

export async function listPartners(query: ListPartnersQuery) {
  const filter: Record<string, unknown> = statusFilter(query.status);

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
    PartnerRepository.findMany(filter, { sort, skip, limit: query.limit }),
    PartnerRepository.count(filter),
  ]);

  return {
    items: items.map((item) => toPartnerDto(item as PartnerDocument)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createPartner(input: CreatePartnerInput) {
  const partner = await PartnerRepository.create(input);
  return toPartnerDto(partner);
}

export async function updatePartner(id: string, input: UpdatePartnerInput) {
  const partner = await PartnerRepository.findById(id);
  if (!partner) {
    throw new AppError(messages.partnerNotFound, statusCodes.NOT_FOUND);
  }

  if (input.name !== undefined) partner.name = input.name;
  if (input.logo !== undefined) partner.logo = input.logo;
  if (input.status !== undefined) partner.status = input.status;
  if (input.sortOrder !== undefined) partner.sortOrder = input.sortOrder;

  await PartnerRepository.save(partner);
  return toPartnerDto(partner);
}

export async function deletePartner(id: string) {
  const partner = await PartnerRepository.findById(id);
  if (!partner) {
    throw new AppError(messages.partnerNotFound, statusCodes.NOT_FOUND);
  }

  partner.deletedAt = new Date();
  partner.status = "inactive";
  await PartnerRepository.save(partner);
  return { id };
}

export async function restorePartner(id: string) {
  const partner = await PartnerRepository.findById(id);
  if (!partner) {
    throw new AppError(messages.partnerNotFound, statusCodes.NOT_FOUND);
  }
  if (!partner.deletedAt) {
    throw new AppError(messages.partnerNotDeleted, statusCodes.BAD_REQUEST);
  }

  partner.deletedAt = null;
  partner.status = "active";
  await PartnerRepository.save(partner);
  return toPartnerDto(partner);
}
