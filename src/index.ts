import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import type { Collection, Db } from "mongodb";

// Re-export crawler
export { Crawler } from "./crawler/index.js";
export { MediaWikiClient } from "./crawler/mediawiki.js";
export { mergeEntry, defaultMergeRules } from "./crawler/merger.js";
export { getParser, parseTFWiki, parseWikipedia, parseFandom } from "./crawler/parsers/index.js";
export { parseGenericInfobox, parsePortableInfobox, extractFirstParagraph, extractCategories, extractPageTitle } from "./crawler/parser.js";
export type {
  CrawlSourceConfig,
  CrawlCategory,
  FieldMappingEntry,
  CrawlSourceRecord,
  CrawledEntry,
  MergeConfig,
  MergeResult,
  MergeableDocument,
  ParsedWikiPage,
  CrawlProgress,
} from "./crawler/types.js";
import type { CrawlSourceConfig, CrawlCategory, FieldMappingEntry } from "./crawler/types.js";

// Universal Document Rules
export interface ICAPBaseDocument {
  id: string;
  name: string;
  description: string;
  continuityId: string;
  factions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Flexible variant template (Alt-modes, Multiverse variants, Eras)
export interface ILoreVariant<T> {
  variantName: string;
  appearanceMediaId: string;
  specifications: T;
}

// Runtime validation baseline
export const CAPBaseSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  continuityId: z.string(),
  factions: z.array(z.string()),
});

// Standardized MongoDB Data Layer
export abstract class CAPRepository<T extends ICAPBaseDocument> {
  protected collection: Collection<T>;

  constructor(db: Db, collectionName: string) {
    this.collection = db.collection<T>(collectionName);
  }

  async create(
    data: Omit<T, "id" | "createdAt" | "updatedAt">,
  ): Promise<T & { id: string }> {
    const doc = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await this.collection.insertOne(doc);
    return doc as T & { id: string };
  }

  async findById(id: string): Promise<T | null> {
    return this.collection.findOne({ id } as any) as Promise<T | null>;
  }

  async findByName(name: string): Promise<T | null> {
    return this.collection.findOne({
      name: { $regex: name, $options: "i" },
    } as any) as Promise<T | null>;
  }

  async listAll(): Promise<T[]> {
    return this.collection.find({}).toArray() as Promise<T[]>;
  }

  async update(
    id: string,
    data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T | null> {
    return this.collection.findOneAndUpdate(
      { id } as any,
      { $set: { ...data, updatedAt: new Date() } } as any,
      { returnDocument: "after" },
    ) as Promise<T | null>;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }
}

// --- Dynamic Schema Generator ---

export type FieldType = "string" | "number" | "boolean" | "date";

export interface CustomFieldConfig {
  key: string;
  type: FieldType;
  label: string;
}

export interface EntryFormatConfig {
  requiredFields?: string[];
  customFields?: CustomFieldConfig[];
}

export interface CrawlingConfig {
  sources: CrawlSourceConfig[];
  mergeRules: Record<string, boolean>;
}

export interface SettingsConfig {
  databaseName: string;
  entryFormat: EntryFormatConfig;
  crawling?: CrawlingConfig;
}

const CustomFieldSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date"]),
  label: z.string().min(1),
});

const CrawlSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseUrl: z.string().url(),
  apiUrl: z.string().url(),
  parser: z.enum(["tfwiki", "wikipedia", "fandom"]),
  categories: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    path: z.string().min(1),
  })),
  fieldMapping: z.record(z.string(), z.object({
    target: z.string().min(1),
    type: z.enum(["string", "number", "boolean", "string-array"]),
  })),
});

export const CAPSettingsSchema = z.object({
  databaseName: z.string().min(1),
  entryFormat: z.object({
    requiredFields: z.array(z.string()).optional(),
    customFields: z.array(CustomFieldSchema).optional(),
  }),
  crawling: z.object({
    sources: z.array(CrawlSourceSchema),
    mergeRules: z.record(z.string(), z.boolean()),
  }).optional(),
});

function zodTypeForFieldType(fieldType: FieldType): z.ZodType {
  switch (fieldType) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.string().datetime();
    default:
      throw new Error(`Unknown field type: ${fieldType}`);
  }
}

export function generateDynamicSchema(
  customFields: CustomFieldConfig[],
): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {};

  for (const field of customFields) {
    shape[field.key] = zodTypeForFieldType(field.type);
  }

  return CAPBaseSchema.extend(shape);
}

export function loadSettings(path: string): SettingsConfig {
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw);
  return CAPSettingsSchema.parse(parsed) as SettingsConfig;
}
