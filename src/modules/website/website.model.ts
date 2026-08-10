import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Which storefront page this section belongs to */
export const WEBSITE_PAGES = [
  "homepage",
  "header",
  "footer",
  "about",
  "contact",
] as const;

export type WebsitePage = (typeof WEBSITE_PAGES)[number];

/**
 * Section kinds — shared across pages.
 * Add schemas in validation when implementing each type's `data`.
 */
export const WEBSITE_SECTION_TYPES = [
  "hero",
  "banner",
  "announcement",
  "feature",
  "gallery",
] as const;

export type WebsiteSectionType = (typeof WEBSITE_SECTION_TYPES)[number];

/** Types that currently have a full admin form + data schema */
export const WEBSITE_IMPLEMENTED_TYPES = ["hero", "feature"] as const;

const websiteSectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    page: {
      type: String,
      enum: WEBSITE_PAGES,
      required: true,
    },
    type: {
      type: String,
      enum: WEBSITE_SECTION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "website_sections",
  },
);

websiteSectionSchema.index({
  deletedAt: 1,
  page: 1,
  status: 1,
  sortOrder: 1,
});
websiteSectionSchema.index({
  page: 1,
  type: 1,
  deletedAt: 1,
  status: 1,
  sortOrder: 1,
});
websiteSectionSchema.index({ startAt: 1, endAt: 1 });

export type WebsiteSectionDocument = Omit<
  InferSchemaType<typeof websiteSectionSchema>,
  "deletedAt" | "data" | "type" | "status" | "page" | "startAt" | "endAt"
> & {
  _id: mongoose.Types.ObjectId;
  page: WebsitePage;
  type: WebsiteSectionType;
  status: "active" | "inactive";
  data: Record<string, unknown>;
  startAt?: Date | null;
  endAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const WebsiteSection: Model<WebsiteSectionDocument> =
  mongoose.models.WebsiteSection ??
  mongoose.model<WebsiteSectionDocument>(
    "WebsiteSection",
    websiteSectionSchema,
  );

function previewImage(data: Record<string, unknown>): string | null {
  const image = typeof data.image === "string" ? data.image.trim() : "";
  if (image) return image;
  const mobile =
    typeof data.mobileImage === "string" ? data.mobileImage.trim() : "";
  return mobile || null;
}

export function toWebsiteSectionDto(section: WebsiteSectionDocument) {
  return {
    id: section._id.toString(),
    name: section.name,
    page: section.page,
    type: section.type,
    status: section.status,
    sortOrder: section.sortOrder ?? 0,
    startAt: section.startAt ? section.startAt.toISOString() : null,
    endAt: section.endAt ? section.endAt.toISOString() : null,
    data: section.data ?? {},
    deletedAt: section.deletedAt ? section.deletedAt.toISOString() : null,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
  };
}

export function toWebsiteSectionListItem(section: WebsiteSectionDocument) {
  const data = section.data ?? {};
  return {
    id: section._id.toString(),
    name: section.name,
    page: section.page,
    type: section.type,
    status: section.status,
    sortOrder: section.sortOrder ?? 0,
    image: previewImage(data),
    startAt: section.startAt ? section.startAt.toISOString() : null,
    endAt: section.endAt ? section.endAt.toISOString() : null,
    deletedAt: section.deletedAt ? section.deletedAt.toISOString() : null,
    createdAt: section.createdAt.toISOString(),
  };
}
