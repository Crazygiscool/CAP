import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSettings } from "../index.js";

function withTempFile(
  name: string,
  content: string,
  fn: (path: string) => void,
) {
  const dir = mkdtempSync(join(tmpdir(), "cap-test-"));
  const filePath = join(dir, name);
  writeFileSync(filePath, content, "utf-8");
  try {
    fn(filePath);
  } finally {
    try {
      unlinkSync(filePath);
    } catch {}
    try {
      rmdirSync(dir);
    } catch {}
  }
}

const validSettings = JSON.stringify({
  databaseName: "Nova Cronum",
  entryFormat: {
    requiredFields: ["name", "description", "continuityId", "factions"],
    customFields: [
      { key: "sparkId", type: "string", label: "Spark Signature" },
      { key: "firepower", type: "number", label: "Firepower Rating" },
    ],
  },
});

describe("loadSettings", () => {
  it("parses a valid settings file", () => {
    withTempFile("settings.json", validSettings, (path) => {
      const config = loadSettings(path);
      expect(config.databaseName).toBe("Nova Cronum");
      expect(config.entryFormat.customFields).toHaveLength(2);
      expect(config.entryFormat.customFields![0].key).toBe("sparkId");
    });
  });

  it("accepts settings without customFields", () => {
    const minimal = JSON.stringify({
      databaseName: "Test Universe",
      entryFormat: {},
    });
    withTempFile("settings.json", minimal, (path) => {
      const config = loadSettings(path);
      expect(config.databaseName).toBe("Test Universe");
      expect(config.entryFormat.customFields).toBeUndefined();
    });
  });

  it("throws on missing file", () => {
    expect(() => loadSettings("/nonexistent/path.json")).toThrow();
  });

  it("throws on invalid JSON", () => {
    withTempFile("settings.json", "{bad json}", (path) => {
      expect(() => loadSettings(path)).toThrow();
    });
  });

  it("throws on invalid field type", () => {
    const bad = JSON.stringify({
      databaseName: "Test",
      entryFormat: {
        customFields: [{ key: "x", type: "binary", label: "X" }],
      },
    });
    withTempFile("settings.json", bad, (path) => {
      expect(() => loadSettings(path)).toThrow();
    });
  });

  it("throws when databaseName is missing", () => {
    const bad = JSON.stringify({
      entryFormat: {},
    });
    withTempFile("settings.json", bad, (path) => {
      expect(() => loadSettings(path)).toThrow();
    });
  });
});
