# AGENTS.md — Amis de l'Harmonie de Sucy

Agent-facing operating rules for this repository. Read this file top to bottom before
your first edit.

- **What this file is**: rules, real paths, and known traps.
- **What it is not**: architecture explanation (see `ARCHITECTURE.md`) or onboarding
  (see `README.md`). This file cross-references them instead of repeating them.

French community music association website. **All user-facing content, UI copy, and
commit messages are in French.** Production: <https://amis-harmonie-sucy.fr>.

Stack: RedwoodSDK (`rwsdk`) on Cloudflare Workers, React 19 with Server Components,
Tailwind CSS 4, Radix UI, D1 (SQLite), R2, KV, TypeScript strict, Vite 7, Vitest.
Exact versions live in `package.json` — read it there, never trust a version copied
into documentation.

---

## 1. Commit, push & deploy (non-negotiable)

**Every completed change is committed, pushed, and deployed.** A "completed change"
is a coherent, verified unit of work — not each individual file write. Do not batch
several unrelated changes into one release, and do not release after every keystroke:
`npm run release` runs `clean && build`, which purges the Vite cache and takes minutes.

### Before you touch anything

Run `git status --short`. **Any file already modified is not yours.** Never stage it,
never revert it, never deploy on top of it. If it is still dirty when you finish, say
so explicitly in your final message and leave it alone.

### Step 1 — Validate

All three must pass before committing. The pre-commit hook only runs `tsc` plus
lint-staged on _staged_ files, and **the deploy path runs no tests at all**, so these
are your real gates:

```shell
npm run types      # tsc, must exit 0
npm run lint       # eslint, must be clean
npx vitest run     # must be green — NOT `npm test`, see §2
```

### Step 2 — Commit

- Stage explicit paths: `git add src/foo.ts`.
  **Never `git add -A`, `git add .`, or `git commit -a`** — they sweep up other
  people's work in progress.
- Commit message in **French**, Conventional Commits, matching existing history:
  `feat(presence): …`, `fix(auth): …`, `refactor: …`. Check `git log --oneline` first.

### Step 3 — Push

```shell
git push
```

The remote is HTTPS and no credential helper is configured, so a bare `git push` fails
with `could not read Username for 'https://github.com'`. `gh` is authenticated, so
push through its credential helper without changing stored git config:

```shell
git -c credential.https://github.com.helper='!gh auth git-credential' push
```

If the push still fails, **say so and carry on** — see step 4.

### Step 4 — Deploy

```shell
npm run release   # rw-scripts ensure-deploy-env && clean && build && wrangler deploy
```

This goes **straight to production** — there is no staging environment.

Two properties make this dangerous, and both drive the preconditions below:

1. **`wrangler deploy` builds the working tree, not `HEAD`.** A dirty tree ships
   whatever is on disk, including someone else's unfinished work. "My commit is done"
   is _not_ a sufficient guard; "the tree is clean" is.
2. **Code and database migrations deploy separately.** Shipping code that reads a new
   table or column before that migration is applied to production takes the site down.

**All preconditions must hold before you deploy:**

- [ ] `git status --short` is **empty**
- [ ] The change is committed and the three gates in step 1 passed. A **failed push
      does not block the deploy** — push only syncs the remote, whereas what protects
      production is the clean tree. Report the failure and deploy anyway.
- [ ] `npx wrangler d1 migrations list amis-harmonie-db --remote` shows **nothing
      pending** — apply migrations to production _before_ deploying code that needs them.
      This ordering assumes an **additive** migration; for a destructive one (drop or
      rename), first ship code that tolerates both shapes, then migrate.
- [ ] You are on `main`

**If any precondition fails: stop, do not deploy, and report what is blocking.**
A blocked deploy is a correct outcome, not a rule violation — commit your work, then
report the blocker.

After deploying, confirm the site answers:

```shell
curl -sS -o /dev/null -w '%{http_code}\n' https://amis-harmonie-sucy.fr/
```

### Scope

There is **no docs-only exemption**: documentation changes are committed, pushed, and
deployed like everything else. (`*.md` is not part of the Worker bundle, so its
deployment is a no-op — but the rule is deliberately unconditional so it cannot erode
through self-classification.)

Note that `public/**` **is** served in production via the `ASSETS` binding, and
`migrations/**` and `wrangler.jsonc` are runtime configuration. None of these are
"just files".

---

## 2. Commands

| Command                                                              | Purpose                                       |
| -------------------------------------------------------------------- | --------------------------------------------- |
| `npm run dev`                                                        | Dev server (Vite) → <http://localhost:5173>   |
| `npm run build`                                                      | Production build                              |
| `npm run types`                                                      | TypeScript type-check (`tsc`)                 |
| `npm run check`                                                      | Regenerate Cloudflare types, then type-check  |
| `npm run generate`                                                   | `ensure-env`, then `wrangler types`           |
| `npm run lint` / `npm run lint:fix`                                  | ESLint — must be clean                        |
| `npm run format`                                                     | Prettier over `src/**/*.{ts,tsx,css,md}`      |
| `npx vitest run`                                                     | **Run tests once** — use this in any workflow |
| `npx vitest run src/lib/__tests__/dates.test.ts`                     | Single test file                              |
| `npx vitest run -t "formate la date"`                                | Tests matching a name                         |
| `npm run release`                                                    | Build + deploy to production                  |
| `npx wrangler d1 migrations create amis-harmonie-db "<description>"` | New migration file                            |
| `npx wrangler d1 migrations apply amis-harmonie-db --local`          | Apply migrations locally                      |
| `npx wrangler d1 migrations apply amis-harmonie-db --remote`         | Apply migrations to **production**            |
| `npx wrangler d1 migrations list amis-harmonie-db --remote`          | List migrations pending in production         |

> **Trap — `npm test`, `npm run test:ui` and `npm run test:coverage` all start Vitest
> in watch mode and never exit.** They are for interactive use only. Any script, gate,
> or agent workflow must use `npx vitest run`.

**Pre-commit hook** (Husky): `npm run types`, then `npx lint-staged`
(`*.{ts,tsx}` → `eslint --fix` + `prettier --write`; `*.{css,md,json}` → `prettier --write`).

---

## 3. Repository map

```
src/
  worker.tsx            # Entry point — ALL routes, middleware, cache wrapper (~590 lines)
  client.tsx            # Client hydration entry
  app/
    Document.tsx        # HTML shell: <html lang="fr">, SEO/OG/JSON-LD, fonts, theme script
    Layout.tsx          # Header + <main> + Footer
    headers.ts          # setCommonHeaders() + buildContentSecurityPolicy()
    seo.ts              # getPageSeo(), isNoIndexPath(), SITE_URL, DEFAULT_OG_IMAGE
    styles.css          # Tailwind 4 imports, @theme inline tokens, global styles
    pages/              # 17 files — public pages (server by default)
    admin/              # 18 files — admin dashboard; pages.tsx holds the wrappers
    musician/           # 52 files — musician portal (all "use client")
    api/
      admin/            # 13 per-resource admin handlers
      *.ts              # auth, public endpoints, upload, images, sitemap, robots
    components/         # 12 shared + shared/ (2) + ui/ (13 primitives)
    shared/             # links.ts, gallery.ts
  db/
    schema.sql          # Reference ONLY — not executed, and drifted (see §6)
    types.ts            # All DB entity interfaces and unions
    seed-local.sql      # Local-only seed data — never run against --remote
  lib/                  # 15 modules (see below)
migrations/             # 14 files — SOURCE OF TRUTH for the schema
public/                 # Served in production via the ASSETS binding
types/                  # rw.d.ts, vite.d.ts, css.d.ts
```

`src/lib/` — `cache.ts`, `utils.ts` (`cn()`), `constants.ts`, `dates.ts`, `logger.ts`,
`rate-limit.ts`, `validation.ts`, `env-config.ts`, `sitemap.ts`, `image-utils.ts`,
`public-events.ts`, `presence.ts`, `presence-groups.ts`, `instruments.ts`,
`crud-factory.ts`.

**Routing**: every route — public pages, admin, musician, and all APIs — is declared in
`src/worker.tsx`. Read that file rather than trusting any route list in documentation.
Helpers in use are `route`, `render`, `layout` and `defineApp`; `prefix()` is not used.

**Cloudflare bindings** (`wrangler.jsonc`), accessed via `import { env } from "cloudflare:workers"`:

| Binding      | Type   | Name                   | Usage                         |
| ------------ | ------ | ---------------------- | ----------------------------- |
| `env.DB`     | D1     | `amis-harmonie-db`     | Database                      |
| `env.R2`     | R2     | `amis-harmonie-images` | Image uploads                 |
| `env.CACHE`  | KV     | `amis-harmonie-cache`  | Page cache + version tracking |
| `env.ASSETS` | Assets | `public/`              | Static files served in prod   |

Secret: **`RESEND_API_KEY`** (required — magic-link emails). Tunable vars in
`wrangler.jsonc`: `LOG_LEVEL`, `CACHE_TTL_SECONDS`,
`CACHE_STALE_WHILE_REVALIDATE_SECONDS`, and `RATE_LIMIT_{AUTH,CONTACT,GUESTBOOK,UPLOAD}_MAX`.

For how routing, caching, auth, CSP, and logging actually work, read `ARCHITECTURE.md`.

---

## 4. Writing code here

### Server vs client components

Server components are the default — no directive. Add `"use client"` as the **first
line** for state, effects, event handlers, or browser APIs.

Admin pages use a wrapper pattern: `src/app/admin/pages.tsx` exports 13 `Admin*Page`
server wrappers that render `<AdminLayout><XxxAdminClient /></AdminLayout>`.
**Follow the pattern of the directory you are editing** — the `Client` suffix is on 14
of the 15 client components in `admin/` (`Dashboard.tsx` → `AdminDashboard` is the
exception), but the `Admin` infix is not universal (`InfoSettingsClient`,
`OutingSettingsClient`). `musician/` is entirely client-side and uses no suffix at all.
Do not "normalise" one directory to match the other.

### API handlers

Handlers live in `src/app/api/`, one module per resource under `api/admin/`.

Rules: auth first → dispatch on method → validate → query → `invalidateCache()` after
any mutation → `try`/`catch` with `logger.error`. Always return JSON
(`{ success: true }` or `{ error }`), and `405` for an unhandled method.
→ full pattern: `ARCHITECTURE.md` § API Handler Pattern.

**To write a new handler, copy `src/app/api/admin/events.ts`.** All 14 modules in
`api/admin/` import `checkAdminAuth` from `src/app/api/admin-crud.ts`, which holds
only that helper plus two input interfaces — it is _not_ a CRUD template despite its
name. `src/lib/crud-factory.ts` (`createCrudApi`) exists but has **no call sites**;
it is not the house pattern, so do not adopt it for new code.

Rate limiting is wired **in the route** in `src/worker.tsx`, before the handler runs —
currently `/api/contact`, `/api/guestbook`, `/api/auth/magic-link`,
`/api/auth/musician-magic-link`, and `/api/admin/upload` (admin-authed, not public).

### Authentication

Magic-link over email (Resend). **Three roles: `ADMIN`, `SUPER_ADMIN`, `MUSICIAN`** —
use the `isAdmin` helper in `src/db/types.ts` rather than comparing role strings.
Sessions are cookie-based (`admin_session` / `musician_session`); there is no JWT.

```typescript
const auth = await adminAuthMiddleware({ request });
if (auth instanceof Response) return auth; // redirect when unauthenticated
// auth.email and auth.role are available
```

Both middlewares are **private to `src/worker.tsx`** — they are not exported, so route
guards belong there, not in page files. `role` is returned by the admin middleware
only; `musicianAuthMiddleware` returns `email`, `userId`, `firstName`, `lastName` and
`avatar`. Inside API handlers use `checkAdminAuth` from `src/app/api/admin-crud.ts`,
which returns either a `401` JSON `Response` or `null`.

Auth failures: redirect for pages, `401` JSON for APIs.

### Logging

Use the structured logger, **not `console`**:

```typescript
import { logger, getRequestLogContext } from "@/lib/logger";
logger.error("Database error:", error, getRequestLogContext(request));
```

ESLint permits `console.warn` / `console.error` as a fallback only; `console.log` is
flagged.

### Style

- **Prettier**: double quotes, semicolons, ES5 trailing commas, 100-char width,
  2-space indent, LF.
- **Imports**: `"use client"` → external packages → `cloudflare:workers` → `@/` (alias
  for `src/`) → `import type` for type-only imports.
- **TypeScript strict**: never `as any`, `@ts-ignore`, or `@ts-expect-error`.
  (ESLint only _warns_ on `no-explicit-any` — the ban is a project rule, so the linter
  passing does not mean you are allowed to use `any`.)
  Use `interface` for entity shapes, `type` for unions. Type D1 results:
  `.first<User>()`, `.all<Event>()`. Nullable columns are `string | null`, not `?`.
  Prefix intentionally unused identifiers with `_`.
- **Styling**: Tailwind 4 only — no per-component CSS files. Theme tokens live in
  `src/app/styles.css` under `@theme inline` (21 `--color-*`, 3 `--radius-*`,
  `--font-sans` = Plus Jakarta Sans, `--font-heading` = Clash Display). Dark mode is
  class-based (`.dark` on `<html>`). The 13 UI primitives all use lowercase filenames;
  only `button.tsx` and `label.tsx` use CVA, so do not assume a variant API exists on
  the others. Merge classes with `cn()` from `src/lib/utils.ts`.
- **Security headers**: `src/app/headers.ts` sets HSTS, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and a nonce-based CSP. Inline `<script>`
  needs the `rw.nonce` value. `frame-src` is widened only on `/adhesion` and
  `/partenaires` for the HelloAsso iframe — do not widen it elsewhere.

### Naming

| Entity                | Convention                             | Example                                       |
| --------------------- | -------------------------------------- | --------------------------------------------- |
| Components            | PascalCase                             | `EventCard`, `AdminLayout`                    |
| Client components     | PascalCase + `Client` (admin/pages)    | `ContactAdminClient`                          |
| Helper functions      | camelCase                              | `formatDateFrench`, `isEventPast`             |
| API handlers          | `handleXxxApi` / `handleXxxSubmission` | `handleEventsApi`                             |
| Files (components)    | PascalCase `.tsx`                      | `EventCard.tsx`                               |
| Files (ui primitives) | lowercase `.tsx`                       | `button.tsx`, `card.tsx`                      |
| Files (api/lib)       | lowercase/kebab-case `.ts`             | `admin-crud.ts`, `presence-groups.ts`         |
| DB entities           | `interface` PascalCase                 | `interface Event { … }`                       |
| Unions                | `type`                                 | `type PresenceStatus = "present" \| "absent"` |

---

## 5. Database & migrations

Direct D1 prepared statements, no ORM:

```typescript
import { env } from "cloudflare:workers";

const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
```

Use `env.DB.batch([...])` when several statements must succeed together (see
`src/app/api/admin/users.ts`).

**All schema changes go through the migration system. Never run `wrangler d1 execute`
for schema-altering SQL.**

1. `npx wrangler d1 migrations create amis-harmonie-db "description"`
2. Edit the generated file in `migrations/`
3. Apply locally: `… migrations apply amis-harmonie-db --local`
4. Apply to production: `… migrations apply amis-harmonie-db --remote`
5. Update `src/db/types.ts`, and `src/db/schema.sql` if you touched structure

Migrations are **append-only** — never edit one that has already been applied. Guard
with `IF NOT EXISTS` / `IF EXISTS`. Current state: 14 migrations, latest
`0014_add_primary_flag_to_harmonie_instruments.sql`.

> **`migrations/` is authoritative. `src/db/schema.sql` is a stale reference — do not
> use it to confirm that a table or column exists.** See §6.

---

## 6. Known traps

1. **`npm test` / `test:ui` / `test:coverage` are watch mode.** Use `npx vitest run`.
2. **`src/db/schema.sql` has drifted from `migrations/`.** It is missing the tables
   `outing_settings`, `card_order_settings`, `info_settings`, `idea_reads`, and the
   column `users.last_login` — all of which exist in `migrations/` and in production.
   Verify schema questions against `migrations/`, never against `schema.sql`.
3. **`wrangler deploy` builds the working tree, not `HEAD`.** Deploying with a dirty
   tree ships uncommitted work.
4. **Neither `admin-crud.ts` nor `crud-factory.ts` is the CRUD template.** The first
   only holds `checkAdminAuth`; the second has no call sites at all. Copy
   `src/app/api/admin/events.ts` instead.
5. **Three roles, not two** — `SUPER_ADMIN` exists and is easy to miss.
   `README.md:137` still claims two; it is wrong.
6. **The seed file is `src/db/seed-local.sql`**, and it is local-only. Both
   `README.md:112` and `ARCHITECTURE.md:36` call it `seed-data.sql`; that filename
   does not exist.
7. **`no-explicit-any` is an ESLint warning, not an error.** A clean lint run does not
   prove the codebase is free of `any`.

---

## 7. Testing

Vitest with `happy-dom`, `globals: true`, setup in `src/__tests__/setup.ts`, and
`cloudflare:workers` aliased to `src/__tests__/mocks/cloudflare-workers.ts`.
Tests live in `__tests__/` directories colocated with the code.

Current baseline: **29 test files on disk, 28 executed, 196 tests passing** —
`src/lib/__tests__/cache.test.ts` is excluded in `vitest.config.ts` because it needs
real Cloudflare bindings. Test names are written in French, matching the codebase.

Run once with `npx vitest run`. Keep this baseline green; it is a gate in §1.

---

## 8. Where to look first

1. `src/worker.tsx` — every route and the app entry point
2. `ARCHITECTURE.md` — how caching, auth, logging, and the API layer are designed
3. `src/db/types.ts` — all DB entity interfaces and unions
4. `migrations/` — the real schema
5. `src/app/styles.css` — theme tokens and global styles
6. `src/app/api/admin/events.ts` — a representative admin CRUD handler
