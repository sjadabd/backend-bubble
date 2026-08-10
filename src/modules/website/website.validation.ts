import { z } from "zod";
import { messages } from "@constants/messages";
import {
  WEBSITE_PAGES,
  WEBSITE_SECTION_TYPES,
} from "./website.model";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, messages.invalidWebsiteSectionId);

const dateInput = z.coerce.date({ error: messages.websiteDatesInvalid });

const heroButtonSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(2000),
  style: z.enum(["primary", "secondary"]).default("primary"),
});

/** Type-specific payloads — expand when implementing Banner / Gallery / etc. */
export const heroDataSchema = z
  .object({
    title: z.string().trim().max(200).optional().default(""),
    subtitle: z.string().trim().max(200).optional().default(""),
    description: z.string().trim().max(2000).optional().default(""),
    backgroundType: z.enum(["image", "video", "color"]),
    /** Allows ~2.5MB binary as base64 data URL; prefer /images/... public paths */
    image: z
      .string()
      .trim()
      .max(3_500_000, "حجم الصورة كبير جداً — استخدم مساراً عاماً أو صورة أصغر من 2.5 ميجابايت")
      .optional()
      .default(""),
    mobileImage: z
      .string()
      .trim()
      .max(3_500_000, "حجم صورة الموبايل كبير جداً — استخدم مساراً عاماً أو صورة أصغر")
      .optional()
      .default(""),
    video: z
      .string()
      .trim()
      .max(3_500_000, "حجم الفيديو كبير جداً")
      .optional()
      .default(""),
    backgroundColor: z.string().trim().max(40).optional().default(""),
    overlay: z.number().int().min(0).max(100).optional().default(40),
    contentPosition: z
      .enum(["left", "center", "right"])
      .optional()
      .default("center"),
    textTheme: z.enum(["light", "dark"]).optional().default("light"),
    buttons: z.array(heroButtonSchema).max(2).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.backgroundType === "image" && !data.image.trim()) {
      ctx.addIssue({
        code: "custom",
        message: messages.websiteHeroImageRequired,
        path: ["image"],
      });
    }
    if (data.backgroundType === "video" && !data.video.trim()) {
      ctx.addIssue({
        code: "custom",
        message: messages.websiteHeroVideoRequired,
        path: ["video"],
      });
    }
    if (data.backgroundType === "color" && !data.backgroundColor.trim()) {
      ctx.addIssue({
        code: "custom",
        message: messages.websiteHeroColorRequired,
        path: ["backgroundColor"],
      });
    }
  });

const featureItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
});

/**
 * Feature payload — story / values / contact on About (and TrustStrip items on homepage).
 * Footer historically stores its payload under type=`feature`; `.passthrough()` keeps those keys.
 */
export const featureDataSchema = z
  .object({
    title: z.string().trim().max(200).optional().default(""),
    subtitle: z.string().trim().max(200).optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    image: z
      .string()
      .trim()
      .max(3_500_000, "حجم الصورة كبير جداً — استخدم مساراً عاماً أو صورة أصغر")
      .optional()
      .default(""),
    mobileImage: z
      .string()
      .trim()
      .max(3_500_000, "حجم صورة الموبايل كبير جداً")
      .optional()
      .default(""),
    items: z.array(featureItemSchema).max(8).optional().default([]),
    phone: z.string().trim().max(40).optional().default(""),
    whatsapp: z.string().trim().max(40).optional().default(""),
    email: z.string().trim().max(120).optional().default(""),
    address: z.string().trim().max(500).optional().default(""),
    hours: z.string().trim().max(200).optional().default(""),
  })
  .passthrough();

/** Placeholder until type-specific forms are built */
const pendingSectionDataSchema = z.record(z.string(), z.unknown()).default({});

export const sectionDataByType = {
  hero: heroDataSchema,
  banner: pendingSectionDataSchema,
  announcement: pendingSectionDataSchema,
  feature: featureDataSchema,
  gallery: pendingSectionDataSchema,
} as const;

export const createWebsiteSectionSchema = z
  .object({
    name: z
      .string({ error: messages.websiteSectionNameRequired })
      .trim()
      .min(2)
      .max(200),
    page: z.enum(WEBSITE_PAGES, {
      error: messages.websiteSectionPageRequired,
    }),
    type: z.enum(WEBSITE_SECTION_TYPES, {
      error: messages.websiteSectionTypeRequired,
    }),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    sortOrder: z.number().int().optional().default(0),
    startAt: dateInput.nullable().optional().default(null),
    endAt: dateInput.nullable().optional().default(null),
    data: z.record(z.string(), z.unknown()),
  })
  .superRefine((input, ctx) => {
    if (input.startAt && input.endAt && input.startAt >= input.endAt) {
      ctx.addIssue({
        code: "custom",
        message: messages.websiteDatesInvalid,
        path: ["endAt"],
      });
    }

    const schema = sectionDataByType[input.type];
    const parsed = schema.safeParse(input.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["data", ...issue.path],
        });
      }
    }
  });

export const updateWebsiteSectionSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    sortOrder: z.number().int().optional(),
    startAt: dateInput.nullable().optional(),
    endAt: dateInput.nullable().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: messages.atLeastOneField,
  });

export const websiteSectionIdParamSchema = z.object({
  id: objectId,
});

export const listWebsiteSectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  sortBy: z
    .enum([
      "createdAt",
      "name",
      "status",
      "sortOrder",
      "startAt",
      "endAt",
      "updatedAt",
      "page",
      "type",
    ])
    .default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["active", "inactive", "deleted"]).default("active"),
  /** Filter by website page (not pagination) */
  sitePage: z
    .union([z.enum(WEBSITE_PAGES), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  type: z
    .union([z.enum(WEBSITE_SECTION_TYPES), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateWebsiteSectionInput = z.infer<
  typeof createWebsiteSectionSchema
>;
export type UpdateWebsiteSectionInput = z.infer<
  typeof updateWebsiteSectionSchema
>;
export type ListWebsiteSectionsQuery = z.infer<
  typeof listWebsiteSectionsQuerySchema
>;
