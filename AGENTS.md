# AGENTS.md — Amis de l'Harmonie de Sucy Website

## Project Overview

French community music association website. Built with **RedwoodSDK** (RWSDK) on **Cloudflare Workers**, React 19 with Server Components, Tailwind CSS 4, and D1 (SQLite) database. All user-facing content is in **French**.

## Tech Stack

- **Framework**: RedwoodSDK (`rwsdk`) — React full-stack framework for Cloudflare Workers
- **Runtime**: Cloudflare Workers (Wrangler)
- **UI**: React 19 with RSC, Tailwind CSS 4, Radix UI primitives, Lucide icons
- **Database**: Cloudflare D1 (SQLite) — schema in `src/db/schema.sql`
- **Storage**: Cloudflare R2 (images), KV (cache)
- **Language**: TypeScript 5.9, strict mode
- **Build**: Vite 7

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build |
| `npm run types` | TypeScript type-check only |
| `npm run check` | Generate Cloudflare types + type-check |
| `npm run release` | Build + deploy to Cloudflare Workers |
| `npm run generate` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run clean` | Clear Vite cache |

**No test framework configured.** No Jest, Vitest, or similar. Validate changes with `npm run types`.

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
    schema.sql             # D1 database schema
    admin-schema.sql       # Admin-specific schema additions
    types.ts               # TypeScript interfaces for all DB entities
    seed-data.sql          # Sample data
  lib/
    cache.ts               # KV-based page caching with versioned invalidation
    utils.ts               # cn() helper (clsx + tailwind-merge)
types/                     # Global type declarations (rw.d.ts, vite.d.ts, css.d.ts)
public/images/             # Static assets (logo, SVGs, event photos)
wrangler.jsonc             # Cloudflare bindings: D1 (DB), R2 (STORAGE), KV (CACHE)
```

## Architecture Patterns

### Routing (`src/worker.tsx`)

Routes defined via RWSDK's `defineApp` + `route`/`layout`/`render` helpers:

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

Pattern: single `async function handleXxxApi(request: Request): Promise<Response>`

```typescript
export async function handleEventsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    if (request.method === "GET") { /* ... */ }
    if (request.method === "POST") { /* ... */ }
    if (request.method === "PUT") { /* ... */ }
    if (request.method === "DELETE") { /* ... */ }
  } catch (error) {
    console.error("Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
```

- Auth check first, then method dispatch
- Query params via `new URL(request.url).searchParams`
- JSON body via `request.json()`, form data via `request.formData()`
- Always return `{ success: true }` or `{ error: "message" }` with `Content-Type: application/json`
- Call `invalidateCache()` after any mutation

### Database Access

Direct D1 prepared statements via `env.DB`:

```typescript
import { env } from "cloudflare:workers";
const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
const results = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all();
```

### Authentication

Magic-link email auth. Two roles: `ADMIN` and `MUSICIAN`. Middleware pattern:

```typescript
const auth = await adminAuthMiddleware({ request });
if (auth instanceof Response) return auth; // redirect to login
// auth.email is available
```

## Code Style

### Imports

1. `"use client"` directive (if needed) — always first line
2. External packages (`react`, `lucide-react`, `@radix-ui/*`)
3. Cloudflare imports (`cloudflare:workers`)
4. Internal imports via `@/` alias (maps to `src/`)
5. Use `import type` for type-only imports

### Naming

| Entity | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase | `EventCard`, `AdminLayout` |
| Client components | PascalCase + `Client` suffix | `ContactAdminClient` |
| Props interfaces | `ComponentNameProps` | `EventCardProps` |
| Helper functions | camelCase | `formatDateFrench`, `isEventPast` |
| API handlers | `handleXxxApi` / `handleXxxSubmission` | `handleEventsApi` |
| Files (components) | PascalCase `.tsx` | `EventCard.tsx` |
| Files (ui primitives) | lowercase `.tsx` | `button.tsx`, `card.tsx` |
| Files (api/utils) | lowercase/kebab-case `.ts` | `admin-crud.ts`, `cache.ts` |
| DB types | `interface` with PascalCase | `interface Event { ... }` |
| Union types | `type` keyword | `type UserRole = 'ADMIN' \| 'MUSICIAN'` |

### TypeScript

- **Strict mode** enabled — do not suppress errors with `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use `interface` for object shapes (especially DB entities)
- Use `type` for unions and aliases
- Generic type params for D1 queries: `.first<User>()`, `.all<Event>()`
- Nullable DB fields: `string | null` (not optional `?`)
- Form data: cast with `as string` after `.get()`

### Styling

- **Tailwind CSS 4** only — no separate CSS files per component
- Theme tokens in `src/app/styles.css` via `@theme` directive
- Dark mode: `dark:` variant (class-based, toggled via `.dark` on `<html>`)
- UI primitives use **CVA** (class-variance-authority) for variant patterns
- Class merging: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- Fonts: `Raleway` (body), `Merriweather Sans` (headings)
- Colors: `--color-primary: #a5b3e2`, `--color-primary-dark: #8b9bcc`

### Error Handling

- Validate HTTP method first, return 405
- Validate required fields, return 400 with message
- Wrap main logic in try/catch
- Log with `console.error("Context:", error)`
- Return 500 with generic error message
- Auth failures: redirect to login page (not 401)

### State Management (Client Components)

- `useState` for local state — no external state library
- `useEffect` for initialization and side effects
- Fetch-based data loading with `loading`/`error` state
- Dialog/modal state tracked with separate `useState` booleans

## Cloudflare Bindings (wrangler.jsonc)

| Binding | Type | Name | Usage |
|---------|------|------|-------|
| `env.DB` | D1 | `amis-harmonie-db` | SQLite database |
| `env.STORAGE` | R2 | `amis-harmonie-storage` | Image uploads |
| `env.CACHE` | KV | `amis-harmonie-cache` | Page cache + version tracking |

Access bindings via: `import { env } from "cloudflare:workers";`

## Key Files to Understand First

1. `src/worker.tsx` — All routing and the app entry point
2. `src/db/types.ts` — All TypeScript interfaces for DB entities
3. `src/db/schema.sql` — Database schema (source of truth)
4. `src/app/styles.css` — Theme tokens and global styles
5. `src/app/api/admin-crud.ts` — CRUD pattern template for new endpoints
