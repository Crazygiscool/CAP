import { describe, it, expect } from "vitest";
import {
  CAPBaseSchema,
  generateDynamicSchema,
  type CustomFieldConfig,
} from "../index.js";

const baseFields = {
  name: "Optimus Prime",
  description: "Leader of the Autobots",
  continuityId: "g1",
  factions: ["Autobots"],
};

describe("generateDynamicSchema", () => {
  it("returns base schema when customFields is empty", () => {
    const schema = generateDynamicSchema([]);
    const result = schema.safeParse(baseFields);
    expect(result.success).toBe(true);
  });

  it("adds a string field", () => {
    const fields: CustomFieldConfig[] = [
      { key: "sparkId", type: "string", label: "Spark Signature" },
    ];
    const schema = generateDynamicSchema(fields);
    const result = schema.safeParse({
      ...baseFields,
      sparkId: "SP-2187",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a number for a string field", () => {
    const fields: CustomFieldConfig[] = [
      { key: "sparkId", type: "string", label: "Spark Signature" },
    ];
    const schema = generateDynamicSchema(fields);
    const result = schema.safeParse({
      ...baseFields,
      sparkId: 42,
    });
    expect(result.success).toBe(false);
  });

  it("adds a number field", () => {
    const fields: CustomFieldConfig[] = [
      { key: "firepower", type: "number", label: "Firepower Rating" },
    ];
    const schema = generateDynamicSchema(fields);
    const ok = schema.safeParse({
      ...baseFields,
      firepower: 9000,
    });
    expect(ok.success).toBe(true);

    const fail = schema.safeParse({
      ...baseFields,
      firepower: "over 9000",
    });
    expect(fail.success).toBe(false);
  });

  it("adds a boolean field", () => {
    const fields: CustomFieldConfig[] = [
      { key: "isOnline", type: "boolean", label: "Online Status" },
    ];
    const schema = generateDynamicSchema(fields);
    const ok = schema.safeParse({
      ...baseFields,
      isOnline: true,
    });
    expect(ok.success).toBe(true);

    const fail = schema.safeParse({
      ...baseFields,
      isOnline: "yes",
    });
    expect(fail.success).toBe(false);
  });

  it("adds a date field (ISO datetime string)", () => {
    const fields: CustomFieldConfig[] = [
      { key: "activated", type: "date", label: "Activation Date" },
    ];
    const schema = generateDynamicSchema(fields);
    const ok = schema.safeParse({
      ...baseFields,
      activated: "2024-01-15T08:00:00.000Z",
    });
    expect(ok.success).toBe(true);

    const fail = schema.safeParse({
      ...baseFields,
      activated: "not-a-date",
    });
    expect(fail.success).toBe(false);
  });

  it("handles multiple custom fields of different types", () => {
    const fields: CustomFieldConfig[] = [
      { key: "sparkId", type: "string", label: "Spark Signature" },
      { key: "firepower", type: "number", label: "Firepower Rating" },
      { key: "isOnline", type: "boolean", label: "Online Status" },
    ];
    const schema = generateDynamicSchema(fields);
    const result = schema.safeParse({
      ...baseFields,
      sparkId: "SP-2187",
      firepower: 9000,
      isOnline: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing custom fields", () => {
    const fields: CustomFieldConfig[] = [
      { key: "sparkId", type: "string", label: "Spark Signature" },
    ];
    const schema = generateDynamicSchema(fields);
    const result = schema.safeParse(baseFields);
    expect(result.success).toBe(false);
  });

  it("still enforces base schema requirements", () => {
    const schema = generateDynamicSchema([]);
    const result = schema.safeParse({ name: "Megatron" });
    expect(result.success).toBe(false);
  });
});
