import mongoose from "mongoose";
import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { BrandRepository } from "@modules/brands";
import { AttributeRepository } from "@modules/attributes";
import { TagRepository } from "@modules/tags";
import { CategoryRepository } from "@modules/categories";
import { ProductRepository } from "./product.repository";
import {
  toProductDto,
  toProductListItem,
  toVariantDto,
  type ProductDocument,
  type ProductVariant,
} from "./product.model";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateVariantBodyInput,
  VariantBodyInput,
} from "./product.validation";

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return base || `product-${Date.now()}`;
}

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  let i = 1;
  while (await ProductRepository.findBySlug(slug, excludeId)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

async function assertBrand(brandId: string) {
  const brand = await BrandRepository.findById(brandId);
  if (!brand || brand.deletedAt || brand.status !== "active") {
    throw new AppError(messages.brandInactiveOrMissing, statusCodes.BAD_REQUEST);
  }
  return brand;
}

async function resolveCategoryIds(categoryIds: string[]) {
  if (categoryIds.length === 0) return [];
  const unique = [...new Set(categoryIds)];
  const resolved: string[] = [];

  for (const id of unique) {
    const category = await CategoryRepository.findById(id);
    if (!category) {
      throw new AppError(messages.categoryInvalidRef, statusCodes.BAD_REQUEST);
    }
    // Soft-deleted categories are dropped so saves aren't blocked by stale refs
    if (category.deletedAt) continue;
    resolved.push(id);
  }

  return resolved;
}

async function assertTags(tagIds: string[]) {
  if (tagIds.length === 0) return;
  const tags = await TagRepository.findByIds(tagIds);
  if (tags.length !== new Set(tagIds).size) {
    throw new AppError(messages.tagInvalidRef, statusCodes.BAD_REQUEST);
  }
}

async function assertVariantAttributes(
  attrs: Array<{ attributeId: string; valueId: string }>,
) {
  if (attrs.length === 0) return;
  const attributeIds = [...new Set(attrs.map((item) => item.attributeId))];
  const attributes = await AttributeRepository.findByIds(attributeIds);
  const map = new Map(
    attributes.map((item) => [item._id.toString(), item] as const),
  );

  for (const pair of attrs) {
    const attribute = map.get(pair.attributeId);
    if (!attribute) {
      throw new AppError(messages.attributeInvalidRef, statusCodes.BAD_REQUEST);
    }
    const valueOk = (attribute.values ?? []).some(
      (value) => value._id.toString() === pair.valueId,
    );
    if (!valueOk) {
      throw new AppError(messages.attributeInvalidRef, statusCodes.BAD_REQUEST);
    }
  }
}

async function assertSkuAvailable(sku: string, excludeProductId?: string) {
  const existing = await ProductRepository.findByVariantSku(
    sku,
    excludeProductId,
  );
  if (existing) {
    throw new AppError(messages.variantSkuInUse, statusCodes.CONFLICT);
  }
}

function mapVariantInput(input: VariantBodyInput): ProductVariant {
  return {
    _id: new mongoose.Types.ObjectId(),
    sku: input.sku,
    barcode: input.barcode ?? "",
    image: input.image ?? "",
    attributes: (input.attributes ?? []).map((item) => ({
      attributeId: new mongoose.Types.ObjectId(item.attributeId),
      valueId: new mongoose.Types.ObjectId(item.valueId),
    })),
    price: input.price,
    oldPrice: input.oldPrice ?? null,
    cost: input.cost ?? null,
    stock: input.stock ?? 0,
    reserved: input.reserved ?? 0,
    package: {
      weight: input.package?.weight ?? null,
      unit: input.package?.unit ?? "",
      carton: input.package?.carton ?? "",
    },
    status: input.status ?? "active",
  };
}

function statusFilter(status: ListProductsQuery["status"]) {
  if (status === "active") return { status: "active", deletedAt: null };
  if (status === "inactive") return { status: "inactive", deletedAt: null };
  return { deletedAt: { $ne: null } };
}

export async function listProducts(query: ListProductsQuery) {
  const filter: Record<string, unknown> = statusFilter(query.status);

  if (query.brandId) filter.brandId = query.brandId;

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ title: regex }, { titleEn: regex }, { slug: regex }];
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ProductRepository.findManyLean(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    ProductRepository.count(filter),
  ]);

  const brandIds = [
    ...new Set(items.map((item) => item.brandId.toString())),
  ];
  const brands = await BrandRepository.findByIds(brandIds);
  const brandMap = new Map(
    brands.map((brand) => [brand._id.toString(), brand.name] as const),
  );

  return {
    items: items.map((item) =>
      toProductListItem(
        item as ProductDocument,
        brandMap.get(item.brandId.toString()) ?? null,
      ),
    ),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function getProduct(id: string) {
  const product = await ProductRepository.findByIdLean(id);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }
  return toProductDto(product as ProductDocument);
}

export async function createProduct(input: CreateProductInput) {
  await assertBrand(input.brandId);
  const categoryIds = await resolveCategoryIds(input.categoryIds ?? []);
  await assertTags(input.tags ?? []);

  for (const variant of input.variants ?? []) {
    await assertVariantAttributes(variant.attributes ?? []);
    await assertSkuAvailable(variant.sku);
  }

  const baseSlug = slugify(input.slug?.trim() || input.title);
  const slug = await ensureUniqueSlug(baseSlug);

  const product = await ProductRepository.create({
    title: input.title,
    titleEn: input.titleEn ?? "",
    slug,
    description: input.description ?? "",
    brandId: input.brandId,
    categoryIds,
    tags: input.tags ?? [],
    gallery: input.gallery ?? [],
    features: input.features ?? [],
    seo: input.seo ?? { title: "", description: "" },
    variants: (input.variants ?? []).map(mapVariantInput),
    featured: input.featured ?? false,
    status: input.status ?? "active",
    deletedAt: null,
  });

  return toProductDto(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await ProductRepository.findById(id);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }

  if (input.brandId !== undefined) {
    await assertBrand(input.brandId);
    product.brandId = new mongoose.Types.ObjectId(input.brandId);
  }
  if (input.categoryIds !== undefined) {
    const categoryIds = await resolveCategoryIds(input.categoryIds);
    product.categoryIds = categoryIds.map(
      (value) => new mongoose.Types.ObjectId(value),
    );
  }
  if (input.tags !== undefined) {
    await assertTags(input.tags);
    product.tags = input.tags.map((value) => new mongoose.Types.ObjectId(value));
  }
  if (input.title !== undefined) product.title = input.title;
  if (input.titleEn !== undefined) product.titleEn = input.titleEn;
  if (input.description !== undefined) product.description = input.description;
  if (input.gallery !== undefined) product.gallery = input.gallery;
  if (input.features !== undefined) product.features = input.features;
  if (input.seo !== undefined) product.seo = input.seo;
  if (input.featured !== undefined) product.featured = input.featured;
  if (input.status !== undefined) product.status = input.status;

  if (input.slug !== undefined) {
    const slug = await ensureUniqueSlug(slugify(input.slug), id);
    product.slug = slug;
  }

  await ProductRepository.save(product);
  return toProductDto(product);
}

export async function deleteProduct(id: string) {
  const product = await ProductRepository.findById(id);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }
  product.deletedAt = new Date();
  product.status = "inactive";
  await ProductRepository.save(product);
  return { id };
}

export async function restoreProduct(id: string) {
  const product = await ProductRepository.findById(id);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }
  if (!product.deletedAt) {
    throw new AppError(messages.productNotDeleted, statusCodes.BAD_REQUEST);
  }
  product.deletedAt = null;
  product.status = "active";
  await ProductRepository.save(product);
  return toProductDto(product);
}

export async function addVariant(productId: string, input: VariantBodyInput) {
  const product = await ProductRepository.findById(productId);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }

  await assertVariantAttributes(input.attributes ?? []);
  await assertSkuAvailable(input.sku);

  const variant = mapVariantInput(input);
  product.variants.push(variant);
  await ProductRepository.save(product);
  return toVariantDto(variant);
}

export async function updateVariant(
  productId: string,
  variantId: string,
  input: UpdateVariantBodyInput,
) {
  const product = await ProductRepository.findById(productId);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }

  const variant = product.variants.find(
    (item) => item._id.toString() === variantId,
  );
  if (!variant) {
    throw new AppError(messages.variantNotFound, statusCodes.NOT_FOUND);
  }

  if (input.sku !== undefined && input.sku !== variant.sku) {
    await assertSkuAvailable(input.sku, productId);
    variant.sku = input.sku;
  }
  if (input.attributes !== undefined) {
    await assertVariantAttributes(input.attributes);
    variant.attributes = input.attributes.map((item) => ({
      attributeId: new mongoose.Types.ObjectId(item.attributeId),
      valueId: new mongoose.Types.ObjectId(item.valueId),
    }));
  }
  if (input.barcode !== undefined) variant.barcode = input.barcode;
  if (input.image !== undefined) variant.image = input.image;
  if (input.price !== undefined) variant.price = input.price;
  if (input.oldPrice !== undefined) variant.oldPrice = input.oldPrice;
  if (input.cost !== undefined) variant.cost = input.cost;
  if (input.stock !== undefined) variant.stock = input.stock;
  if (input.reserved !== undefined) variant.reserved = input.reserved;
  if (input.status !== undefined) variant.status = input.status;
  if (input.package !== undefined) {
    variant.package = {
      weight: input.package.weight ?? null,
      unit: input.package.unit ?? "",
      carton: input.package.carton ?? "",
    };
  }

  await ProductRepository.save(product);
  return toVariantDto(variant);
}

export async function removeVariant(productId: string, variantId: string) {
  const product = await ProductRepository.findById(productId);
  if (!product) {
    throw new AppError(messages.productNotFound, statusCodes.NOT_FOUND);
  }

  const before = product.variants.length;
  product.variants = product.variants.filter(
    (item) => item._id.toString() !== variantId,
  );
  if (product.variants.length === before) {
    throw new AppError(messages.variantNotFound, statusCodes.NOT_FOUND);
  }

  await ProductRepository.save(product);
  return { id: variantId };
}
