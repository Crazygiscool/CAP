import type {
  CrawlSourceConfig,
  CrawledEntry,
  CrawlProgress,
  CrawlSourceRecord,
  FieldMappingEntry,
  MergeableDocument,
  ParsedWikiPage,
} from "./types.js";
import { MediaWikiClient } from "./mediawiki.js";
import { getParser } from "./parsers/index.js";

function castValue(
  raw: string,
  type: FieldMappingEntry["type"],
): string | number | boolean {
  switch (type) {
    case "number": {
      const n = parseInt(raw, 10);
      return isNaN(n) ? raw : n;
    }
    case "boolean":
      return raw.toLowerCase() === "yes" || raw.toLowerCase() === "true";
    default:
      return raw;
  }
}

function mapFields(
  parsed: ParsedWikiPage,
  fieldMapping: Record<string, FieldMappingEntry>,
  continuityId: string,
): { description: string; continuityId: string; factions: string[]; customFields: Record<string, unknown> } {
  const result: { description: string; continuityId: string; factions: string[]; customFields: Record<string, unknown> } = {
    description: parsed.description,
    continuityId,
    factions: [],
    customFields: {},
  };

  // Try to infer continuity from categories
  for (const cat of parsed.categories) {
    const lower = cat.toLowerCase();
    if (
      lower.includes("generation 1") || lower.includes("g1") ||
      lower.includes("beast wars") || lower.includes("beast machines") ||
      lower.includes("armada") || lower.includes("energon") ||
      lower.includes("cybertron") || lower.includes("animated") ||
      lower.includes("prime") || lower.includes("robots in disguise") ||
      lower.includes("aligned") || lower.includes("cyberverse") ||
      lower.includes("earthspark") || lower.includes("wfc") ||
      lower.includes("siege") || lower.includes("earthrise") ||
      lower.includes("kingdom")
    ) {
      result.continuityId = cat.replace(/^Category:/, "");
      break;
    }
  }

  for (const field of parsed.infoboxFields) {
    const mapping = fieldMapping[field.label];
    if (!mapping) continue;

    if (mapping.target === "factions") {
      result.factions = field.value
        .split(/[,;/\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (mapping.target === "description") {
      if (field.value.length > result.description.length) {
        result.description = field.value;
      }
    } else if (mapping.target === "continuityId") {
      if (!result.continuityId) result.continuityId = field.value;
    } else {
      result.customFields[mapping.target] = castValue(field.value, mapping.type);
    }
  }

  return result;
}

export class Crawler<T extends MergeableDocument> {
  private client: MediaWikiClient;
  private parserFn: (html: string) => ParsedWikiPage;
  private sourceConfig: CrawlSourceConfig;

  constructor(config: CrawlSourceConfig) {
    this.client = new MediaWikiClient(config);
    this.parserFn = getParser(config.parser);
    this.sourceConfig = config;
  }

  async discover(categoryPath: string, maxPages = 500): Promise<string[]> {
    return this.client.listCategoryMembers(categoryPath, maxPages);
  }

  async scrape(pageTitle: string): Promise<CrawledEntry<T> | null> {
    const html = await this.client.fetchPageHtml(pageTitle);
    const parsed = this.parserFn(html);
    if (!parsed.title) return null;

    const mapped = mapFields(parsed, this.sourceConfig.fieldMapping, "");

    const source: CrawlSourceRecord = {
      url: `${this.sourceConfig.baseUrl}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
      wiki: this.sourceConfig.id,
      fetchedAt: new Date(),
    };

    return {
      name: parsed.title,
      description: mapped.description,
      continuityId: mapped.continuityId,
      factions: mapped.factions,
      customFields: mapped.customFields,
      source,
    } as CrawledEntry<T>;
  }

  async crawlCategory(
    categoryPath: string,
    onProgress?: (progress: CrawlProgress) => void,
    maxPages = 500,
  ): Promise<CrawledEntry<T>[]> {
    const titles = await this.discover(categoryPath, maxPages);
    const entries: CrawledEntry<T>[] = [];

    for (let i = 0; i < titles.length; i++) {
      onProgress?.({
        current: i + 1,
        total: titles.length,
        pageTitle: titles[i],
      });

      try {
        const entry = await this.scrape(titles[i]);
        if (entry) entries.push(entry);
      } catch {
        // skip pages that fail to parse
      }
    }

    return entries;
  }
}
