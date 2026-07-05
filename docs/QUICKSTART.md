# Quick Start — Building a Universe App with CAP

This guide walks through creating a **Nova Cronum**-style lore application from scratch.

## 1. Create the project

```sh
mkdir nova-cronum && cd nova-cronum
npm init -y
npm install ../cap      # or: npm install file:../cap
npm install mongodb@^6 zod@^3
```

Set `"type": "module"` in `package.json`.

## 2. Create settings.json

```json
{
  "databaseName": "Nova Cronum",
  "entryFormat": {
    "customFields": [
      { "key": "sparkId", "type": "string", "label": "Spark Signature" },
      { "key": "primaryFunction", "type": "string", "label": "Designated Function" },
      { "key": "firepower", "type": "number", "label": "Firepower Rating" },
      { "key": "isOnline", "type": "boolean", "label": "Active Status" },
      { "key": "activated", "type": "date", "label": "Activation Date" }
    ]
  }
}
```

## 3. Connect and seed

```typescript
// src/db.ts
import { loadSettings, CAPRepository, ICAPBaseDocument } from "cap";
import { MongoClient, Db } from "mongodb";

export interface CharacterEntry extends ICAPBaseDocument {
  sparkId: string;
  primaryFunction: string;
  firepower: number;
  isOnline: boolean;
  activated: string; // ISO datetime string
}

export class CharacterRepo extends CAPRepository<CharacterEntry> {
  constructor(db: Db) {
    super(db, "characters");
  }
}

const config = loadSettings("./settings.json");
const client = new MongoClient("mongodb://localhost:27017");
const db = client.db(config.databaseName);
export const repo = new CharacterRepo(db);
```

```typescript
// src/seed.ts
import { repo } from "./db.js";

const optimus = await repo.create({
  name: "Optimus Prime",
  description: "Leader of the Autobots",
  continuityId: "g1",
  factions: ["Autobots"],
  sparkId: "SP-2187",
  primaryFunction: "Matrix of Leadership Bearer",
  firepower: 9000,
  isOnline: true,
  activated: "1984-09-17T00:00:00.000Z",
});

console.log("Created:", optimus.id);
```

## 4. Validate incoming data dynamically

```typescript
// src/validate.ts
import { loadSettings, generateDynamicSchema } from "cap";

const config = loadSettings("./settings.json");
const schema = generateDynamicSchema(config.entryFormat.customFields ?? []);

// Use schema.parse() in API routes to reject bad data
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json(result.error);
}
```

## 5. Full CRUD pattern

```typescript
// src/routes.ts
import { repo } from "./db.js";

// READ
const all = await repo.listAll();
const one = await repo.findById("some-uuid");
const search = await repo.findByName("optimus");

// CREATE (returns entry with generated id + timestamps)
const created = await repo.create({ ... });

// UPDATE (partial update, bumps updatedAt)
const updated = await repo.update(created.id, { firepower: 9500 });

// DELETE
const deleted = await repo.delete(created.id); // boolean
```

## 6. With SvelteKit (for frontend + API later)

```sh
npx sv create . --template minimal --types ts
npm install ../cap
```

Then add API routes under `src/routes/api/entries/+server.ts` using the same `repo` pattern above.
