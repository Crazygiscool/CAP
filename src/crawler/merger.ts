import type {
  CrawledEntry,
  CrawlSourceRecord,
  MergeableDocument,
  MergeConfig,
  MergeResult,
} from "./types.js";

function sourceExists(
  sources: CrawlSourceRecord[] | undefined,
  url: string,
): boolean {
  return (sources ?? []).some((s) => s.url === url);
}

export function defaultMergeRules(): MergeConfig {
  return {
    "sources-merge": true,
    "longer-description": true,
    "factions-union": true,
    "fill-empty-fields": true,
    "existing-wins": false,
    "crawled-wins": false,
    "continuity-existing": true,
    "bump-updated-at": true,
    "skip-if-no-name": true,
    "skip-if-source-exists": true,
  };
}

export function mergeEntry<T extends MergeableDocument>(
  existing: T | null,
  crawled: CrawledEntry<T>,
  rules: MergeConfig,
): MergeResult<T> {
  const mergedRules = { ...defaultMergeRules(), ...rules };
  const changes: string[] = [];
  const doc: Record<string, unknown> = {};

  if (mergedRules["skip-if-no-name"] && !crawled.name) {
    return { action: "skipped", changes: ["no name"] };
  }

  if (mergedRules["skip-if-source-exists"] && existing) {
    if (sourceExists(existing.sources, crawled.source.url)) {
      return { action: "skipped", changes: ["source already exists"] };
    }
  }

  if (!existing) {
    // New entry — set everything
    doc.name = crawled.name;
    doc.description = crawled.description;
    doc.continuityId = crawled.continuityId;
    doc.factions = crawled.factions;
    doc.sources = [crawled.source];
    for (const [key, value] of Object.entries(crawled.customFields)) {
      doc[key] = value;
    }
    return { action: "new", doc: doc as Partial<T>, changes: ["new entry"] };
  }

  const mergedSources = [...(existing.sources ?? [])];

  if (mergedRules["sources-merge"]) {
    if (!sourceExists(mergedSources, crawled.source.url)) {
      mergedSources.push(crawled.source);
      changes.push("source added");
    }
  }

  if (mergedRules["longer-description"]) {
    if (
      crawled.description &&
      crawled.description.length > (existing.description ?? "").length
    ) {
      doc.description = crawled.description;
      changes.push("description updated");
    } else if ((existing.description ?? "").length > 0) {
      doc.description = existing.description!;
    }
  } else {
    doc.description = crawled.description || existing.description;
  }

  if (mergedRules["factions-union"]) {
    const all = new Set([
      ...(existing.factions ?? []).map((f) => f.toLowerCase()),
      ...crawled.factions.map((f) => f.toLowerCase()),
    ]);
    const mergedFactions = [...all].map(
      (f) =>
        existing.factions?.find((ef) => ef.toLowerCase() === f) ??
        crawled.factions.find((cf) => cf.toLowerCase() === f)!,
    );
    // Use original casing from existing if available
    const existingLookup = new Map(
      (existing.factions ?? []).map((f) => [f.toLowerCase(), f]),
    );
    const crawledLookup = new Map(
      crawled.factions.map((f) => [f.toLowerCase(), f]),
    );
    const union: string[] = [];
    for (const lower of all) {
      union.push(existingLookup.get(lower) ?? crawledLookup.get(lower)!);
    }
    if (union.length !== (existing.factions ?? []).length) {
      changes.push("factions updated");
    }
    doc.factions = union;
  } else {
    doc.factions = existing.factions ?? crawled.factions;
  }

  if (mergedRules["continuity-existing"] && existing.continuityId) {
    doc.continuityId = existing.continuityId;
  } else {
    doc.continuityId = crawled.continuityId || existing.continuityId;
  }

  // Custom fields
  for (const [key, value] of Object.entries(crawled.customFields)) {
    const existingValue = existing[key];
    if (mergedRules["crawled-wins"]) {
      doc[key] = value;
    } else if (mergedRules["existing-wins"]) {
      if (existingValue !== undefined && existingValue !== null) {
        doc[key] = existingValue;
      } else {
        doc[key] = value;
        if (value !== undefined && value !== null) changes.push(`${key} filled`);
      }
    } else if (mergedRules["fill-empty-fields"]) {
      // Default behavior: fill if existing is null/undefined, keep if set
      if (existingValue === undefined || existingValue === null) {
        doc[key] = value;
        if (value !== undefined && value !== null) changes.push(`${key} filled`);
      } else {
        doc[key] = existingValue;
      }
    }
  }

  doc.sources = mergedSources;

  if (changes.length === 0 && mergedRules["bump-updated-at"]) {
    changes.push("metadata only");
  }

  return {
    action: changes.length > 0 ? "merged" : "skipped",
    doc: doc as Partial<T>,
    changes,
  };
}
