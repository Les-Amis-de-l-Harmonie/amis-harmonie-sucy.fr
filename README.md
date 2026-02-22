# Amis de l'Harmonie de Sucy

Website for the Amis de l'Harmonie de Sucy-en-Brie, a French community music association. Live at **[amis-harmonie-sucy.fr](https://amis-harmonie-sucy.fr)**.

## Stack

| Layer     | Technology                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| Framework | [RedwoodSDK](https://docs.rwsdk.com/) — React full-stack on Cloudflare Workers |
| Runtime   | Cloudflare Workers (Wrangler)                                                  |
| UI        | React 19 with Server Components, Tailwind CSS 4, Radix UI, Lucide              |
| Database  | Cloudflare D1 (SQLite)                                                         |
| Storage   | Cloudflare R2 (images)                                                         |
| Cache     | Cloudflare KV                                                                  |
| Language  | TypeScript 5.9 (strict)                                                        |
| Build     | Vite 7                                                                         |
| Tests     | Vitest + Testing Library                                                       |
| Auth      | Magic-link email via [Resend](https://resend.com)                              |

## Getting Started

### Prerequisites

- Node.js 18+
- A Cloudflare account with D1, R2, and KV configured
- A [Resend](https://resend.com/api-keys) API key

### Setup

```shell
git clone https://github.com/Les-Amis-de-l-Harmonie/amis-harmonie-sucy.fr.git
cd amis-harmonie-sucy.fr
npm install
```

Copy the environment file and fill in your keys:

```shell
cp .env.example .env
```

| Variable         | Description                               |
| ---------------- | ----------------------------------------- |
| `RESEND_API_KEY` | Resend API key for magic-link auth emails |

Apply database migrations locally:

```shell
npx wrangler d1 migrations apply amis-harmonie-db --local
```

### Development

```shell
npm run dev
# → http://localhost:5173
```

## Commands

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Start dev server                       |
| `npm run build`         | Production build                       |
| `npm run types`         | TypeScript type-check                  |
| `npm run check`         | Generate Cloudflare types + type-check |
| `npm run lint`          | ESLint                                 |
| `npm run lint:fix`      | ESLint with auto-fix                   |
| `npm run format`        | Prettier                               |
| `npm test`              | Run all tests                          |
| `npm run test:coverage` | Tests with coverage report             |
| `npm run release`       | Build + deploy to Cloudflare Workers   |

### Database migrations

```shell
# Create a new migration
npx wrangler d1 migrations create amis-harmonie-db "add events table"

# Apply locally
npx wrangler d1 migrations apply amis-harmonie-db --local

# Apply to production
npx wrangler d1 migrations apply amis-harmonie-db --remote

# List pending migrations on production
npx wrangler d1 migrations list amis-harmonie-db --remote
```

> Migrations are append-only. Never edit a file that has already been applied.

## Project Structure

```
src/
├── worker.tsx              # App entry point — routing, middleware, cache
├── client.tsx              # Client-side hydration entry
└── app/
    ├── Document.tsx         # HTML shell (head, fonts, meta tags)
    ├── Layout.tsx           # Shared layout (Header + Footer)
    ├── styles.css           # Tailwind + theme tokens + global styles
    ├── pages/               # Public-facing server components
    ├── admin/               # Admin dashboard (auth-protected)
    ├── musician/            # Musician portal (auth-protected)
    ├── api/                 # API route handlers
    ├── components/          # Shared UI components
    │   └── ui/              # Radix-based primitives (button, card, dialog…)
    └── shared/              # Cross-page utilities
src/db/
    ├── schema.sql           # Schema reference (read-only — use migrations/)
    ├── types.ts             # TypeScript interfaces for all DB entities
    └── seed-data.sql        # Sample data for local development
src/lib/
    ├── cache.ts             # KV-based page caching
    ├── utils.ts             # cn() helper (clsx + tailwind-merge)
    └── ...
migrations/                  # D1 migration files (source of truth)
wrangler.jsonc               # Cloudflare bindings configuration
```

## Architecture Notes

### Routing

All routes are declared in `src/worker.tsx`:

- **Page routes** — `render(Document, [layout(Layout, [route("/", Page)])])`
- **API routes** — `route("/api/...", { get: fn, post: fn })`
- **Auth-protected routes** — inline middleware check before returning JSX

### Server vs. Client Components

Server components are the default (no directive needed). Add `"use client"` at the top of a file for anything with state, effects, or event handlers. Client components use a `Client` suffix by convention (e.g., `ContactAdminClient`).

### Authentication

Magic-link email auth with two roles: `ADMIN` and `MUSICIAN`. Middleware either returns an auth object or a redirect `Response`:

```typescript
const auth = await adminAuthMiddleware({ request });
if (auth instanceof Response) return auth;
// auth.email is now available
```

### Database

Direct D1 prepared statements — no ORM:

```typescript
import { env } from "cloudflare:workers";

const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
```

### Cloudflare Bindings

| Binding     | Type | Name                   |
| ----------- | ---- | ---------------------- |
| `env.DB`    | D1   | `amis-harmonie-db`     |
| `env.R2`    | R2   | `amis-harmonie-images` |
| `env.CACHE` | KV   | `amis-harmonie-cache`  |

## Code Quality

A Husky pre-commit hook runs `tsc` then `lint-staged` (ESLint --fix + Prettier) on every commit.

- **Formatter**: Prettier — double quotes, semicolons, 100-char line width, 2-space indent
- **Linter**: ESLint flat config with TypeScript rules
- **Types**: strict mode — no `as any`, `@ts-ignore`, or `@ts-expect-error`
