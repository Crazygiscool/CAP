# CAP Development Plan

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  CAP (this repo)                             │
│  ─────────────                               │
│  cap package                                 │
│  - CAPRepository<T>                          │
│  - CAPBaseSchema                             │
│  - generateDynamicSchema(customFields)       │
│  - loadSettings(path)                        │
└──────────────────────┬──────────────────────┘
                       │ npm install file:../cap
                       ▼
┌─────────────────────────────────────────────┐
│  Nova Cronum (separate repo)                 │
│  SvelteKit full-stack app                    │
│  - settings.json (backend config, validation)│
│  - CRUD routes with dynamic Zod validation   │
│  - consumes `cap` library                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Frontend Template (separate GH template)    │
│  SvelteKit skeleton                          │
│  - theme.config.json (separate frontend cfg) │
│  - CSS custom properties (build-time baked)  │
│  - Nav from pages config                     │
│  - Favicon injection                         │
│  - Layout + slot for universe pages          │
└─────────────────────────────────────────────┘
```

**Key decisions:**
- No monorepo — `cap` stays a standalone npm package at root
- Backend and frontend use separate config files
- Frontend template is a "Use this template" GitHub repo
- Template loads config at build time (static, baked into CSS)

---

## Task 1: Testing Infrastructure

| # | File | Detail |
|---|------|--------|
| 1.1 | `package.json` | Add `vitest` + `@vitest/coverage-v8` to devDependencies. Add `"test": "vitest run --coverage"` and `"test:watch": "vitest"`. |
| 1.2 | `vitest.config.ts` | `defineConfig({ test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] } })` |
| 1.3 | `src/__tests__/smoke.test.ts` | Import `CAPBaseSchema` and `CAPRepository` — verify they exist and schema validates a valid object. |
| 1.4 | — | `npm install && npm run test` — verify green. |

## Task 2: Dynamic Zod Schema Generator

| # | File | Detail |
|---|------|--------|
| 2.1 | `src/index.ts` | Add types: `CustomFieldConfig`, `EntryFormatConfig`, `SettingsConfig`, `FieldType`. |
| 2.2 | `src/index.ts` | **`generateDynamicSchema(customFields: CustomFieldConfig[])`:** maps each field type to a Zod primitive (`string → z.string()`, `number → z.number()`, `boolean → z.boolean()`, `date → z.string().datetime()`), builds a `z.object({ [key]: zodType })`, merges with `CAPBaseSchema`. Returns composite schema. |
| 2.3 | `src/index.ts` | **`loadSettings(path: string)`:** reads JSON with `fs.readFileSync`, parses, validates against a static `SettingsSchema` (Zod schema for the config file shape), returns typed `SettingsConfig`. |
| 2.4 | — | `npm run build` — verify compilation. |

## Task 3: Tests

| # | File | Detail |
|---|------|--------|
| 3.1 | `src/__tests__/dynamic-schema.test.ts` | Test `generateDynamicSchema`: empty list returns base schema; each type maps correctly; mixed fields; unknown type throws; valid data passes; invalid fails. |
| 3.2 | `src/__tests__/settings-loader.test.ts` | Test `loadSettings` with temp files: valid config parses; missing file throws; invalid JSON throws; missing required field throws. |
| 3.3 | — | `npm run test` — full suite green. |

## Task 4: Documentation

| # | File | Detail |
|---|------|--------|
| 4.1 | `AGENTS.md` | Add test commands, new exports, dynamic schema notes. |
| 4.2 | — | `npm run build && npm run test` — final verification. |

---

## Separate Repos (out of scope for this repo)

### Nova Cronum
- Standalone SvelteKit repo
- `npm install file:../cap` to link cap package
- `settings.json` with universe-specific entry format and custom fields
- API routes using `CAPRepository` + `generateDynamicSchema`
- Serves as the integration test for cap

### Frontend Template
- GitHub template repository ("Use this template")
- SvelteKit skeleton project
- `theme.config.json` with theme, favicon, pages config
- Imports config at build time (Vite JSON import)
- Binds CSS custom properties from theme
- Renders navigation from pages config
- Injects favicon from config path
- Universe apps fork and add their routes on top
