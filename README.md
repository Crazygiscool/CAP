# CAP — Central Archive Protocol

Configuration-driven **TypeScript** library for lore documentation. Wraps **MongoDB** with **Zod** validation to standardize irregular, deeply nested lore data across fictional universes.

## Install

```sh
npm install cap
# peer deps (must install yourself)
npm install mongodb@^6 zod@^3
```

## Quick Start

```typescript
import { loadSettings, generateDynamicSchema, CAPRepository, ICAPBaseDocument } from "cap";
import { MongoClient, Db } from "mongodb";

// 1. Load universe config
const config = loadSettings("./settings.json");

// 2. Build dynamic validation schema
const schema = generateDynamicSchema(config.entryFormat.customFields ?? []);

// 3. Connect to MongoDB
const client = new MongoClient("mongodb://localhost:27017");
const db = client.db(config.databaseName);

// 4. Define an entry type
interface CharacterEntry extends ICAPBaseDocument {
  sparkId: string;
  firepower: number;
  isOnline: boolean;
}

// 5. Extend the repository
class CharacterRepo extends CAPRepository<CharacterEntry> {
  constructor(db: Db) {
    super(db, "characters");
  }
}

// 6. Use it
const repo = new CharacterRepo(db);

const optimus = await repo.create({
  name: "Optimus Prime",
  description: "Leader of the Autobots",
  continuityId: "g1",
  factions: ["Autobots"],
  sparkId: "SP-2187",
  firepower: 9000,
  isOnline: true,
});

console.log(optimus.id); // auto-generated UUID

const found = await repo.findById(optimus.id);
const updated = await repo.update(optimus.id, { firepower: 9500 });
await repo.delete(optimus.id);

// Validate incoming data at runtime
const parsed = schema.parse({
  name: "Bumblebee",
  description: "Autobot scout",
  continuityId: "animated",
  factions: ["Autobots"],
  sparkId: "SP-0001",
  firepower: 500,
  isOnline: true,
});
```

## API

### `CAPRepository<T>`

Abstract class you extend. `T` must implement `ICAPBaseDocument`.

| Method | Returns | Description |
|--------|---------|-------------|
| `create(data)` | `T & { id: string }` | Insert doc with auto-generated UUID + `createdAt` / `updatedAt` |
| `findById(id)` | `T \| null` | Lookup by string id |
| `findByName(name)` | `T \| null` | Case-insensitive regex match on `name` |
| `listAll()` | `T[]` | All documents in the collection |
| `update(id, data)` | `T \| null` | Partial update, auto-bumps `updatedAt`. Returns updated doc or null |
| `delete(id)` | `boolean` | Delete by id. Returns `true` if a document was removed |

### `generateDynamicSchema(customFields)`

Creates a Zod schema from a `settings.json` `customFields` array and merges it with `CAPBaseSchema`.

```typescript
const schema = generateDynamicSchema([
  { key: "sparkId", type: "string", label: "Spark Signature" },
  { key: "firepower", type: "number", label: "Firepower Rating" },
]);
// Result: CAPBaseSchema extended with sparkId (z.string()) + firepower (z.number())
```

Supported field types: `"string"` | `"number"` | `"boolean"` | `"date"`

### `loadSettings(path)`

Reads a JSON file from disk, validates it against `CAPSettingsSchema`, and returns a typed `SettingsConfig`.

```typescript
const config = loadSettings("./settings.json");
// config.databaseName       → string
// config.entryFormat        → { requiredFields?, customFields? }
```

## Configuration

Create a `settings.json` at your app root:

```json
{
  "databaseName": "Nova Cronum",
  "entryFormat": {
    "requiredFields": ["name", "description", "continuityId", "factions"],
    "customFields": [
      { "key": "sparkId", "type": "string", "label": "Spark Signature" },
      { "key": "primaryFunction", "type": "string", "label": "Designated Function" },
      { "key": "firepower", "type": "number", "label": "Firepower Rating" }
    ]
  }
}
```

## Build & Test

```sh
npm run build          # tsc → dist/
npm test               # vitest run --coverage
npm run test:watch     # vitest (watch mode)
```

## Exports

| Export | Kind |
|--------|------|
| `ICAPBaseDocument` | interface |
| `ILoreVariant<T>` | interface |
| `CAPBaseSchema` | Zod schema |
| `CAPRepository<T>` | abstract class |
| `generateDynamicSchema` | function |
| `loadSettings` | function |
| `CAPSettingsSchema` | Zod schema |
| `CustomFieldConfig` | interface |
| `EntryFormatConfig` | interface |
| `SettingsConfig` | interface |
| `FieldType` | type (`"string" | "number" | "boolean" | "date"`) |

## Module System

ESM (`"type": "module"`) with NodeNext module resolution. Import sibling files with `.js` extension.

```typescript
import { CAPRepository } from "cap";
```
