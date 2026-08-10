/**
 * One-shot: extract data:image/... base64 fields from Mongo → files under uploads/
 * and replace document values with absolute PUBLIC_API_URL/uploads/... URLs.
 *
 * Usage:
 *   cd backend
 *   bun run src/database/scripts/migrate-data-urls-to-uploads.ts
 *   bun run src/database/scripts/migrate-data-urls-to-uploads.ts --dry-run
 */
import mongoose from "mongoose";
import { env } from "@config/env";
import { isDataImageUrl, saveImageDataUrl } from "@shared/uploads";

const DRY_RUN = process.argv.includes("--dry-run");

type WalkResult = { changed: boolean; count: number };

async function materialize(value: string): Promise<string> {
  if (!isDataImageUrl(value)) return value;
  if (DRY_RUN) {
    return `[dry-run]${value.slice(0, 32)}…`;
  }
  const saved = await saveImageDataUrl(value);
  return saved.url;
}

async function walk(value: unknown): Promise<{ value: unknown } & WalkResult> {
  if (isDataImageUrl(value)) {
    return {
      value: await materialize(value),
      changed: true,
      count: 1,
    };
  }
  if (Array.isArray(value)) {
    let changed = false;
    let count = 0;
    const next: unknown[] = [];
    for (const item of value) {
      const walked = await walk(item);
      next.push(walked.value);
      changed = changed || walked.changed;
      count += walked.count;
    }
    return { value: next, changed, count };
  }
  if (value && typeof value === "object") {
    let changed = false;
    let count = 0;
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...obj };
    for (const [key, child] of Object.entries(obj)) {
      const walked = await walk(child);
      next[key] = walked.value;
      changed = changed || walked.changed;
      count += walked.count;
    }
    return { value: next, changed, count };
  }
  return { value, changed: false, count: 0 };
}

async function migrateCollection(
  db: mongoose.Connection,
  name: string,
  fields?: string[],
) {
  const col = db.collection(name);
  const cursor = col.find({});
  let docs = 0;
  let images = 0;

  for await (const doc of cursor) {
    const id = doc._id;
    let patch: Record<string, unknown> = {};
    let docImages = 0;

    if (fields?.length) {
      for (const field of fields) {
        const current = (doc as Record<string, unknown>)[field];
        const walked = await walk(current);
        if (walked.changed) {
          patch[field] = walked.value;
          docImages += walked.count;
        }
      }
    } else {
      const { _id, ...rest } = doc as Record<string, unknown>;
      const walked = await walk(rest);
      if (walked.changed) {
        patch = walked.value as Record<string, unknown>;
        docImages = walked.count;
      }
    }

    if (docImages > 0) {
      docs += 1;
      images += docImages;
      console.log(
        `[${name}] ${_idString(id)} → ${docImages} image(s)${DRY_RUN ? " (dry-run)" : ""}`,
      );
      if (!DRY_RUN) {
        await col.updateOne({ _id: id }, { $set: patch });
      }
    }
  }

  console.log(`✔ ${name}: ${docs} docs, ${images} images`);
}

function _idString(id: unknown) {
  return typeof id === "object" && id && "toString" in id
    ? String((id as { toString: () => string }).toString())
    : String(id);
}

async function main() {
  console.log(`PUBLIC_API_URL=${env.publicApiUrl}`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);
  await mongoose.connect(env.mongodbUri);
  const db = mongoose.connection;

  await migrateCollection(db, "categories", ["logo"]);
  await migrateCollection(db, "brands", ["logo"]);
  await migrateCollection(db, "partners", ["logo"]);
  await migrateCollection(db, "promotions", ["image"]);
  await migrateCollection(db, "products", ["gallery", "variants"]);
  await migrateCollection(db, "website_sections", ["data"]);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
