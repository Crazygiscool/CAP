import { z } from "zod";
import { Collection, Db } from "mongodb";

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

  async findByName(name: string): Promise<T | null> {
    const result = await this.collection.findOne({
      name: { $regex: name, $options: "i" },
    } as any);
    return result as T | null;
  }

  async listAll(): Promise<T[]> {
    return this.collection.find({}).toArray() as Promise<T[]>;
  }
}
