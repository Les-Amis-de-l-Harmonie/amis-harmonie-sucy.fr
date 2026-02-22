# AGENTS.md — Amis de l'Harmonie de Sucy Website

## Project Overview

French community music association website. Built with **RedwoodSDK** (RWSDK) on **Cloudflare Workers**, React 19 with Server Components, Tailwind CSS 4, and D1 (SQLite) database. All user-facing content is in **French**.

**Production URL**: https://amis-harmonie-sucy.fr

## Tech Stack

- **Framework**: RedwoodSDK (`rwsdk`) — React full-stack framework for Cloudflare Workers
- **Runtime**: Cloudflare Workers (Wrangler)
- **UI**: React 19 with RSC, Tailwind CSS 4, Radix UI primitives, Lucide icons
- **Database**: Cloudflare D1 (SQLite) — migrations in `migrations/`, schema reference in `src/db/schema.sql`
- **Storage**: Cloudflare R2 (images), KV (cache)
- **Language**: TypeScript 5.9, strict mode
- **Build**: Vite 7
- **Testing**: Vitest with happy-dom, Testing Library
- **Linting**: ESLint (flat config) + Prettier, enforced via Husky pre-commit hook

## Commands

| Command                                                              | Purpose                                 |
| -------------------------------------------------------------------- | --------------------------------------- |
| `npm run dev`                                                        | Start dev server (Vite)                 |
| `npm run build`                                                      | Production build                        |
| `npm run types`                                                      | TypeScript type-check only              |
| `npm run check`                                                      | Generate Cloudflare types + type-check  |
| `npm run release`                                                    | Build + deploy to Cloudflare Workers    |
| `npm run lint`                                                       | Run ESLint                              |
| `npm run lint:fix`                                                   | Auto-fix lint errors                    |
| `npm run format`                                                     | Prettier format all src files           |
| `npm test`                                                           | Run all tests (Vitest)                  |
| `npx vitest run src/lib/__tests__/dates.test.ts`                     | Run a single test file                  |
| `npx vitest run -t "formats date"`                                   | Run tests matching a name pattern       |
| `npm run test:coverage`                                              | Tests with V8 coverage report           |
| `npx wrangler d1 migrations create amis-harmonie-db "<description>"` | Create a new migration file             |
| `npx wrangler d1 migrations apply amis-harmonie-db --local`          | Apply pending migrations locally        |
| `npx wrangler d1 migrations apply amis-harmonie-db --remote`         | Apply pending migrations to production  |
| `npx wrangler d1 migrations list amis-harmonie-db --remote`          | List unapplied migrations on production |

**Pre-commit hook** (Husky): runs `npm run types` then `lint-staged` (ESLint --fix + Prettier on staged `.ts/.tsx` files).

## Project Structure

```
src/
  worker.tsx              # Entry point: routing, middleware, cache layer
  client.tsx              # Client-side hydration entry
  app/
    Document.tsx           # HTML shell (head, fonts, meta)
    Layout.tsx             # Shared layout (Header + Footer wrapper)
    headers.ts             # HTTP header middleware
    styles.css             # Tailwind imports + theme tokens + global styles
    pages/                 # Page components (server components by default)
    admin/                 # Admin dashboard (client components + pages wrapper)
    musician/              # Musician portal (client components)
    api/                   # API handlers (auth, CRUD, upload, images)
    components/            # Shared components
      ui/                  # Radix-based primitives (button, card, dialog, etc.)
    shared/                # Shared utilities used across pages
  db/
    schema.sql             # D1 database schema (reference — NOT used for migrations)
    types.ts               # TypeScript interfaces for all DB entities
    seed-data.sql          # Sample data
  lib/
    cache.ts               # KV-based page caching with versioned invalidation
    utils.ts               # cn() helper (clsx + tailwind-merge)
types/                     # Global type declarations (rw.d.ts, vite.d.ts, css.d.ts)
public/images/             # Static assets (logo, SVGs, event photos)
wrangler.jsonc             # Cloudflare bindings: D1 (DB), R2, KV (CACHE)
migrations/                # D1 database migrations (source of truth for schema changes)
```

## Architecture Patterns

### Routing (`src/worker.tsx`)

- **API routes**: `route("/api/...", handler)` — method-based (`{ post: fn, get: fn }`)
- **Page routes**: Wrapped in `render(Document, [ layout(Layout, [ route("/", Page) ]) ])`
- **Auth routes**: Inline async handlers with auth middleware check
- **Cache layer**: `fetch()` export wraps `app.fetch()` with KV-based page caching

### Server vs Client Components

- **Default is server component** — no directive needed
- **`"use client"`** at file top for interactive components (state, effects, event handlers)
- Client components use `ComponentNameClient` suffix (e.g., `ContactAdminClient`)
- Admin pages: wrapper in `src/app/admin/pages.tsx` re-exports server page → client component

### API Handlers

Pattern: `async function handleXxxApi(request: Request): Promise<Response>`. Auth check first → method dispatch in `if` chain → try/catch wrapper. Always return JSON `{ success: true }` or `{ error: "message" }`. Call `invalidateCache()` after mutations. See `src/app/api/admin-crud.ts` for the canonical pattern.

### Database Access

Direct D1 prepared statements via `import { env } from "cloudflare:workers"`:

```typescript
const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
const results = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all();
```

### Database Migrations (MANDATORY)

**All schema changes MUST go through the D1 migration system.** Never use `wrangler d1 execute` for schema-altering SQL.

1. Create: `npx wrangler d1 migrations create amis-harmonie-db "description"`
2. Edit the generated `.sql` file in `migrations/`
3. Test locally: `npx wrangler d1 migrations apply amis-harmonie-db --local`
4. Apply to prod: `npx wrangler d1 migrations apply amis-harmonie-db --remote`
5. Update `src/db/schema.sql` (reference only) and `src/db/types.ts` if structure changed

Migrations are **append-only** — never edit an already-applied file. Use `IF NOT EXISTS` / `IF EXISTS` guards.

### Authentication

Magic-link email auth. Two roles: `ADMIN` and `MUSICIAN`. Middleware returns auth object or `Response` redirect:

```typescript
const auth = await adminAuthMiddleware({ request });
if (auth instanceof Response) return auth;
// auth.email is available
```

## Code Style

### Formatting (Prettier — `.prettierrc`)

Double quotes, semicolons, trailing commas (ES5), 100-char print width, 2-space indent, LF line endings.

### Imports (order)

1. `"use client"` directive (if needed) — always first line
2. External packages (`react`, `lucide-react`, `@radix-ui/*`)
3. Cloudflare imports (`cloudflare:workers`)
4. Internal imports via `@/` alias (maps to `src/`)
5. Use `import type` for type-only imports

### Naming

| Entity                | Convention                             | Example                                 |
| --------------------- | -------------------------------------- | --------------------------------------- |
| Components            | PascalCase                             | `EventCard`, `AdminLayout`              |
| Client components     | PascalCase + `Client` suffix           | `ContactAdminClient`                    |
| Helper functions      | camelCase                              | `formatDateFrench`, `isEventPast`       |
| API handlers          | `handleXxxApi` / `handleXxxSubmission` | `handleEventsApi`                       |
| Files (components)    | PascalCase `.tsx`                      | `EventCard.tsx`                         |
| Files (ui primitives) | lowercase `.tsx`                       | `button.tsx`, `card.tsx`                |
| Files (api/utils)     | lowercase/kebab-case `.ts`             | `admin-crud.ts`, `cache.ts`             |
| DB types              | `interface` PascalCase                 | `interface Event { ... }`               |
| Union types           | `type` keyword                         | `type UserRole = "ADMIN" \| "MUSICIAN"` |

### TypeScript

- **Strict mode** — never suppress with `as any`, `@ts-ignore`, or `@ts-expect-error`
- `interface` for object shapes (DB entities), `type` for unions/aliases
- Generic type params for D1: `.first<User>()`, `.all<Event>()`
- Nullable DB fields: `string | null` (not optional `?`)
- Unused function params: prefix with `_` (ESLint rule `argsIgnorePattern: "^_"`)
- `no-console` is a warning — only `console.warn` and `console.error` allowed

### Styling

- **Tailwind CSS 4** only — no separate CSS files per component
- Theme tokens in `src/app/styles.css` via `@theme inline` directive with CSS custom properties
- Dark mode: `dark:` variant (class-based, toggled via `.dark` on `<html>`)
- UI primitives use **CVA** (class-variance-authority) for variant patterns
- Class merging: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- Fonts: `Plus Jakarta Sans` (body via `--font-sans`), `Clash Display` (headings via `--font-heading`)

### Error Handling

- Validate HTTP method first, return 405
- Validate required fields, return 400 with message
- Wrap main logic in try/catch, log with `console.error("Context:", error)`, return 500
- Auth failures: redirect to login page (pages) or 401 JSON (API)

## Cloudflare Bindings (wrangler.jsonc)

| Binding     | Type | Name                   | Usage                         |
| ----------- | ---- | ---------------------- | ----------------------------- |
| `env.DB`    | D1   | `amis-harmonie-db`     | SQLite database               |
| `env.R2`    | R2   | `amis-harmonie-images` | Image uploads                 |
| `env.CACHE` | KV   | `amis-harmonie-cache`  | Page cache + version tracking |

Access via: `import { env } from "cloudflare:workers";`

## Testing

- **Framework**: Vitest with `happy-dom` environment, `@testing-library/react` + `@testing-library/user-event`
- **Config**: `vitest.config.ts` — aliases `@/` → `./src`, mocks `cloudflare:workers`
- **Pattern**: `__tests__/` directories colocated with source (e.g., `src/lib/__tests__/dates.test.ts`)
- **Run single file**: `npx vitest run src/lib/__tests__/dates.test.ts`
- **Run by name**: `npx vitest run -t "formats date"`
- Note: `src/lib/__tests__/cache.test.ts` is excluded in vitest config (Cloudflare binding deps)

## Key Files to Understand First

1. `src/worker.tsx` — All routing and the app entry point
2. `src/db/types.ts` — All TypeScript interfaces for DB entities
3. `src/db/schema.sql` — Database schema reference (NOT executed — see migrations/)
4. `src/app/styles.css` — Theme tokens and global styles
5. `src/app/api/admin-crud.ts` — CRUD pattern template for new endpoints
