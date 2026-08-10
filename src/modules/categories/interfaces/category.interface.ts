import type { CategoryDocument } from "../category.model";

export function toCategoryDto(category: CategoryDocument) {
  return {
    id: category._id.toString(),
    title: category.title,
    logo: category.logo,
    description: category.description?.trim() ? category.description : null,
    isActive: category.isActive,
    deletedAt: category.deletedAt ? category.deletedAt.toISOString() : null,
    createdBy: category.createdBy ? category.createdBy.toString() : null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export type CategoryDto = ReturnType<typeof toCategoryDto>;
