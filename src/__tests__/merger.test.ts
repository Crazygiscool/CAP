import { describe, it, expect } from "vitest";
import { mergeEntry, defaultMergeRules } from "../crawler/merger.js";
import type { CrawledEntry, CrawlSourceRecord, MergeableDocument } from "../crawler/types.js";

interface TestDoc extends MergeableDocument {
  sparkId?: string;
  primaryFunction?: string;
}

const source1: CrawlSourceRecord = {
  url: "https://tfwiki.net/wiki/Optimus_Prime_(G1)",
  wiki: "tfwiki",
  fetchedAt: new Date("2025-01-01"),
};

const source2: CrawlSourceRecord = {
  url: "https://en.wikipedia.org/wiki/Optimus_Prime",
  wiki: "wikipedia",
  fetchedAt: new Date("2025-01-02"),
};

function makeCrawled(overrides: Partial<CrawledEntry<TestDoc>> = {}): CrawledEntry<TestDoc> {
  return {
    name: "Optimus Prime",
    description: "Heroic leader of the Autobots",
    continuityId: "Generation 1",
    factions: ["Autobot"],
    customFields: {
      primaryFunction: "Leader",
      sparkId: "SPARK-001",
    },
    source: source1,
    ...overrides,
  } as CrawledEntry<TestDoc>;
}

function makeExisting(overrides: Partial<TestDoc> = {}): TestDoc {
  return {
    id: "existing-id",
    name: "Optimus Prime",
    description: "Leader of the Autobots",
    continuityId: "Generation 1",
    factions: ["Autobot"],
    sparkId: "MANUAL-001",
    primaryFunction: "Supreme Commander",
    sources: [source2],
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("mergeEntry — new entry (no existing)", () => {
  it("returns action=new with all crawled data", () => {
    const result = mergeEntry(null, makeCrawled(), defaultMergeRules());
    expect(result.action).toBe("new");
    expect(result.doc?.name).toBe("Optimus Prime");
    expect(result.doc?.description).toBe("Heroic leader of the Autobots");
    expect(result.doc?.continuityId).toBe("Generation 1");
    expect((result.doc as any).primaryFunction).toBe("Leader");
    expect((result.doc as any).sources).toEqual([source1]);
  });

  it("skips if name is empty and skip-if-no-name is true", () => {
    const result = mergeEntry(null, makeCrawled({ name: "" }), defaultMergeRules());
    expect(result.action).toBe("skipped");
  });
});

describe("mergeEntry — duplicate (existing)", () => {
  it("skips if source already exists and skip-if-source-exists is true", () => {
    const crawled = makeCrawled({ source: source2 });
    const existing = makeExisting();
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect(result.action).toBe("skipped");
  });

  it("merges sources when new source is different", () => {
    const result = mergeEntry(makeExisting(), makeCrawled(), defaultMergeRules());
    expect(result.action).toBe("merged");
    expect((result.doc as any).sources).toHaveLength(2);
    expect((result.doc as any).sources[0]).toEqual(source2);
    expect((result.doc as any).sources[1]).toEqual(source1);
  });

  it("keeps longer description when longer-description is true", () => {
    const crawled = makeCrawled({ description: "Short" });
    const existing = makeExisting({ description: "This is a much longer description for the character" });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect((result.doc as any).description).toBe("This is a much longer description for the character");
  });

  it("prefers crawled description when longer", () => {
    const crawled = makeCrawled({ description: "This is a much longer crawled description" });
    const existing = makeExisting({ description: "Short" });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect((result.doc as any).description).toBe("This is a much longer crawled description");
  });

  it("unions factions", () => {
    const crawled = makeCrawled({ factions: ["Autobot", "Prime"] });
    const existing = makeExisting({ factions: ["Autobot", "Leader"] });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    const factions = (result.doc as any).factions;
    expect(factions).toContain("Autobot");
    expect(factions).toContain("Prime");
    expect(factions).toContain("Leader");
    expect(factions).toHaveLength(3);
  });

  it("fills empty custom fields when fill-empty-fields is true", () => {
    const existing = makeExisting({ sparkId: undefined });
    const crawled = makeCrawled({ customFields: { sparkId: "SPARK-001" } });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect((result.doc as any).sparkId).toBe("SPARK-001");
  });

  it("preserves existing custom field when fill-empty-fields is true", () => {
    const existing = makeExisting({ sparkId: "EXISTING-SPARK" });
    const crawled = makeCrawled({ customFields: { sparkId: "CRAWLED-SPARK" } });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect((result.doc as any).sparkId).toBe("EXISTING-SPARK");
  });

  it("overwrites when crawled-wins is true", () => {
    const existing = makeExisting({ sparkId: "EXISTING" });
    const crawled = makeCrawled({ customFields: { sparkId: "CRAWLED" } });
    const rules = { ...defaultMergeRules(), "crawled-wins": true, "fill-empty-fields": false };
    const result = mergeEntry(existing, crawled, rules);
    expect((result.doc as any).sparkId).toBe("CRAWLED");
  });

  it("preserves existing continuity when continuity-existing is true", () => {
    const existing = makeExisting({ continuityId: "Beast Wars" });
    const crawled = makeCrawled({ continuityId: "Generation 1" });
    const result = mergeEntry(existing, crawled, defaultMergeRules());
    expect((result.doc as any).continuityId).toBe("Beast Wars");
  });

  it("overwrites continuity when continuity-existing is false", () => {
    const existing = makeExisting({ continuityId: "Beast Wars" });
    const crawled = makeCrawled({ continuityId: "Generation 1" });
    const rules = { ...defaultMergeRules(), "continuity-existing": false };
    const result = mergeEntry(existing, crawled, rules);
    expect((result.doc as any).continuityId).toBe("Generation 1");
  });
});

describe("defaultMergeRules", () => {
  it("returns all defaults", () => {
    const rules = defaultMergeRules();
    expect(rules["sources-merge"]).toBe(true);
    expect(rules["longer-description"]).toBe(true);
    expect(rules["factions-union"]).toBe(true);
    expect(rules["fill-empty-fields"]).toBe(true);
    expect(rules["skip-if-no-name"]).toBe(true);
    expect(rules["skip-if-source-exists"]).toBe(true);
  });
});
