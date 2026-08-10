import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { BrandRepository } from "./brand.repository";
import { toBrandDto, type BrandDocument } from "./brand.model";
import type {
  CreateBrandInput,
  UpdateBrandInput,
  ListBrandsQuery,
} from "./brand.validation";

function statusFilter(status: ListBrandsQuery["status"]) {
  if (status === "active") return { status: "active", deletedAt: null };
  if (status === "inactive") return { status: "inactive", deletedAt: null };
  return { deletedAt: { $ne: null } };
}

export async function listBrands(query: ListBrandsQuery) {
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
    BrandRepository.findMany(filter, { sort, skip, limit: query.limit }),
    BrandRepository.count(filter),
  ]);

  return {
    items: items.map((item) => toBrandDto(item as BrandDocument)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createBrand(input: CreateBrandInput) {
  const brand = await BrandRepository.create(input);
  return toBrandDto(brand);
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  const brand = await BrandRepository.findById(id);
  if (!brand) {
    throw new AppError(messages.brandNotFound, statusCodes.NOT_FOUND);
  }

  if (input.name !== undefined) brand.name = input.name;
  if (input.logo !== undefined) brand.logo = input.logo;
  if (input.status !== undefined) brand.status = input.status;
  if (input.sortOrder !== undefined) brand.sortOrder = input.sortOrder;

  await BrandRepository.save(brand);
  return toBrandDto(brand);
}

export async function deleteBrand(id: string) {
  const brand = await BrandRepository.findById(id);
  if (!brand) {
    throw new AppError(messages.brandNotFound, statusCodes.NOT_FOUND);
  }

  brand.deletedAt = new Date();
  brand.status = "inactive";
  await BrandRepository.save(brand);
  return { id };
}

export async function restoreBrand(id: string) {
  const brand = await BrandRepository.findById(id);
  if (!brand) {
    throw new AppError(messages.brandNotFound, statusCodes.NOT_FOUND);
  }
  if (!brand.deletedAt) {
    throw new AppError(messages.brandNotDeleted, statusCodes.BAD_REQUEST);
  }

  brand.deletedAt = null;
  brand.status = "active";
  await BrandRepository.save(brand);
  return toBrandDto(brand);
}
