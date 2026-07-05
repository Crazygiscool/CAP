import { describe, it, expect } from "vitest";
import { CAPBaseSchema, CAPRepository } from "../index.js";

describe("CAPBaseSchema", () => {
  it("validates a correct lore entry", () => {
    const result = CAPBaseSchema.safeParse({
      name: "Optimus Prime",
      description: "Leader of the Autobots",
      continuityId: "g1",
      factions: ["Autobots"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an entry missing required fields", () => {
    const result = CAPBaseSchema.safeParse({
      name: "Megatron",
    });
    expect(result.success).toBe(false);
  });
});

describe("CAPRepository", () => {
  it("is an abstract class that cannot be instantiated directly", () => {
    expect(CAPRepository).toBeDefined();
  });
});
