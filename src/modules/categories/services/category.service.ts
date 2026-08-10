import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { CategoryRepository } from "../repositories";
import { toCategoryDto } from "../interfaces";
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesQueryDto,
} from "../dto";

export async function listCategories(query: ListCategoriesQueryDto) {
  const filter: Record<string, unknown> = {};

  if (query.status === "active") {
    filter.isActive = true;
    filter.deletedAt = null;
  } else if (query.status === "inactive") {
    filter.isActive = false;
    filter.deletedAt = null;
  } else {
    filter.deletedAt = { $ne: null };
  }

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    CategoryRepository.findMany(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    CategoryRepository.count(filter),
  ]);

  return {
    items: items.map((item) => toCategoryDto(item)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createCategory(
  input: CreateCategoryDto,
  createdBy: string,
) {
  const category = await CategoryRepository.create({
    title: input.title,
    logo: input.logo,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    deletedAt: null,
    createdBy,
  });

  return toCategoryDto(category);
}

export async function updateCategory(id: string, input: UpdateCategoryDto) {
  const category = await CategoryRepository.findById(id);
  if (!category) {
    throw new AppError(messages.categoryNotFound, statusCodes.NOT_FOUND);
  }

  if (input.title !== undefined) category.title = input.title;
  if (input.logo !== undefined) category.logo = input.logo;
  if (input.description !== undefined) category.description = input.description;
  if (input.isActive !== undefined) category.isActive = input.isActive;

  await CategoryRepository.save(category);
  return toCategoryDto(category);
}

export async function deleteCategory(id: string) {
  const category = await CategoryRepository.findById(id);
  if (!category) {
    throw new AppError(messages.categoryNotFound, statusCodes.NOT_FOUND);
  }

  category.deletedAt = new Date();
  category.isActive = false;
  await CategoryRepository.save(category);
  return { id };
}

export async function restoreCategory(id: string) {
  const category = await CategoryRepository.findById(id);
  if (!category) {
    throw new AppError(messages.categoryNotFound, statusCodes.NOT_FOUND);
  }

  if (!category.deletedAt) {
    throw new AppError(messages.categoryNotDeleted, statusCodes.BAD_REQUEST);
  }

  category.deletedAt = null;
  category.isActive = true;
  await CategoryRepository.save(category);
  return toCategoryDto(category);
}
