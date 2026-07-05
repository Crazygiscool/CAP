export interface CrawlSourceConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiUrl: string;
  parser: "tfwiki" | "wikipedia" | "fandom";
  categories: CrawlCategory[];
  fieldMapping: Record<string, FieldMappingEntry>;
}

export interface CrawlCategory {
  id: string;
  label: string;
  path: string;
}

export interface FieldMappingEntry {
  target: string;
  type: "string" | "number" | "boolean" | "string-array";
}

export interface CrawlSourceRecord {
  url: string;
  wiki: string;
  fetchedAt: Date;
}

export interface CrawledEntry<T = Record<string, unknown>> {
  name: string;
  description: string;
  continuityId: string;
  factions: string[];
  customFields: Record<string, unknown>;
  source: CrawlSourceRecord;
}

export type MergeConfig = Record<string, boolean>;

export interface MergeResult<T> {
  action: "new" | "merged" | "skipped";
  doc?: Partial<T>;
  changes?: string[];
}

export interface MergeableDocument {
  id?: string;
  name: string;
  description?: string;
  continuityId?: string;
  factions?: string[];
  updatedAt?: Date;
  sources?: CrawlSourceRecord[];
  [key: string]: unknown;
}

export interface ParsedWikiPage {
  title: string;
  description: string;
  categories: string[];
  infoboxFields: { label: string; value: string }[];
}

export interface CrawlProgress {
  current: number;
  total: number;
  pageTitle: string;
}
