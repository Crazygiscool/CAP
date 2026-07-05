import { describe, it, expect, vi, beforeEach } from "vitest";
import { CAPRepository, type ICAPBaseDocument } from "../index.js";

interface TestEntry extends ICAPBaseDocument {
  sparkId: string;
}

class TestRepository extends CAPRepository<TestEntry> {
  constructor(db: any) {
    super(db, "test_entries");
  }
}

function mockDb() {
  const mockCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(() => ({
      toArray: vi.fn(),
    })),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  };

  const db = {
    collection: vi.fn(() => mockCollection),
  } as any;

  return { db, collection: mockCollection };
}

describe("CAPRepository", () => {
  let repo: TestRepository;
  let collection: ReturnType<typeof mockDb>["collection"];

  beforeEach(() => {
    const { db, collection: c } = mockDb();
    repo = new TestRepository(db);
    collection = c;
  });

  describe("create", () => {
    it("inserts a document with generated id and timestamps", async () => {
      collection.insertOne.mockResolvedValue({ acknowledged: true });

      const result = await repo.create({
        name: "Optimus Prime",
        description: "Leader of the Autobots",
        continuityId: "g1",
        factions: ["Autobots"],
        sparkId: "SP-2187",
      });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.name).toBe("Optimus Prime");
      expect(result.sparkId).toBe("SP-2187");

      expect(collection.insertOne).toHaveBeenCalledOnce();
      const inserted = collection.insertOne.mock.calls[0][0];
      expect(inserted.id).toBe(result.id);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("findById", () => {
    it("returns a document by id", async () => {
      const doc = {
        _id: "abc",
        id: "uuid-123",
        name: "Bumblebee",
        description: "Scout",
        continuityId: "g1",
        factions: ["Autobots"],
        sparkId: "SP-0001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      collection.findOne.mockResolvedValue(doc);

      const result = await repo.findById("uuid-123");
      expect(result).toEqual(doc);
      expect(collection.findOne).toHaveBeenCalledWith({ id: "uuid-123" });
    });

    it("returns null when not found", async () => {
      collection.findOne.mockResolvedValue(null);

      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findByName", () => {
    it("returns a document by name (case-insensitive)", async () => {
      const doc = {
        _id: "abc",
        id: "uuid-1",
        name: "Megatron",
        description: "Decepticon leader",
        continuityId: "g1",
        factions: ["Decepticons"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      collection.findOne.mockResolvedValue(doc);

      const result = await repo.findByName("megatron");
      expect(result).toEqual(doc);
    });

    it("returns null when not found", async () => {
      collection.findOne.mockResolvedValue(null);

      const result = await repo.findByName("Starscream");
      expect(result).toBeNull();
    });
  });

  describe("listAll", () => {
    it("returns all documents", async () => {
      const docs = [
        { id: "1", name: "A", description: "", continuityId: "g1", factions: [], createdAt: new Date(), updatedAt: new Date() },
        { id: "2", name: "B", description: "", continuityId: "g1", factions: [], createdAt: new Date(), updatedAt: new Date() },
      ];
      collection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) });

      const result = await repo.listAll();
      expect(result).toEqual(docs);
      expect(result).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("updates fields and bumps updatedAt", async () => {
      const original = {
        id: "uuid-1",
        name: "Optimus Prime",
        description: "Old description",
        continuityId: "g1",
        factions: ["Autobots"],
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-01"),
      };

      const updated = {
        ...original,
        description: "New description",
        updatedAt: new Date(),
      };

      collection.findOneAndUpdate.mockResolvedValue(updated);

      const result = await repo.update("uuid-1", {
        description: "New description",
      });

      expect(result).toEqual(updated);
      expect(collection.findOneAndUpdate).toHaveBeenCalled();

      const [, updateDoc] = collection.findOneAndUpdate.mock.calls[0];
      expect(updateDoc.$set.description).toBe("New description");
      expect(updateDoc.$set.updatedAt).toBeInstanceOf(Date);
    });

    it("returns null when document does not exist", async () => {
      collection.findOneAndUpdate.mockResolvedValue(null);

      const result = await repo.update("nonexistent", {
        description: "Nope",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true when a document is deleted", async () => {
      collection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await repo.delete("uuid-1");
      expect(result).toBe(true);
      expect(collection.deleteOne).toHaveBeenCalledWith({ id: "uuid-1" });
    });

    it("returns false when no document matched", async () => {
      collection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await repo.delete("nonexistent");
      expect(result).toBe(false);
    });
  });
});
