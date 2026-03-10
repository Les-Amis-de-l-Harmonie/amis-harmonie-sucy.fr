# Architecture Overview

This document describes the high-level architecture and key patterns used in the Amis de l'Harmonie de Sucy website.

## Project Structure

```
src/
├── worker.tsx              # Application entry point with routing and caching layer
├── client.tsx              # Client-side hydration entry
├── app/
│   ├── Document.tsx        # HTML shell (head, fonts, meta tags)
│   ├── Layout.tsx          # Shared layout wrapper (Header + Footer)
│   ├── headers.ts          # HTTP header middleware
│   ├── styles.css          # Tailwind CSS imports + theme tokens
│   ├── pages/              # Public-facing server components
│   ├── admin/              # Admin dashboard (auth-protected)
│   ├── musician/           # Musician portal (auth-protected)
│   ├── api/                # API route handlers
│   │   ├── admin/          # Modular admin API handlers
│   │   ├── auth.ts         # Authentication logic
│   │   ├── musician.ts     # Musician portal APIs
│   │   └── ...             # Public API endpoints
│   ├── components/
│   │   ├── ui/             # Radix-based UI primitives
│   │   └── shared/         # Cross-cutting reusable components
│   └── shared/             # Cross-page utilities
├── lib/
│   ├── cache.ts            # KV-based page caching
│   ├── logger.ts           # Structured logging system
│   ├── constants.ts        # Application constants
│   └── utils.ts            # Utility functions (cn() helper)
└── db/
    ├── schema.sql          # Database schema reference
    ├── types.ts            # TypeScript interfaces for entities
    └── seed-data.sql       # Sample data for development
```

## API Architecture

### Modular API Structure

The API is organized into domain-specific modules under `src/app/api/admin/`. Each module handles a single resource or feature domain.

```
src/app/api/
├── admin/                      # Admin API modules
│   ├── events.ts              # Events CRUD with cache invalidation
│   ├── videos.ts              # Video management
│   ├── users.ts               # User management with transactions
│   ├── publications.ts        # Instagram publications
│   ├── gallery.ts             # Gallery image management
│   ├── ideas.ts               # Suggestion/idea system
│   ├── guestbook.ts           # Guestbook moderation
│   ├── contact.ts             # Contact form management
│   ├── info-settings.ts       # Site info configuration
│   ├── outing-settings.ts     # Outing/billetterie settings
│   ├── card-order.ts          # Card display ordering
│   ├── insurance.ts           # Insurance management
│   └── r2-cleanup.ts          # R2 storage cleanup utilities
├── admin-crud.ts              # Shared admin auth utilities
├── admin-analytics.ts         # Admin analytics dashboard
├── auth.ts                    # Magic-link authentication
├── musician.ts                # Musician portal APIs
├── contact.ts                 # Public contact form
├── guestbook.ts               # Public guestbook submissions
├── gallery.ts                 # Public gallery API
├── upload.ts                  # Image upload to R2
├── images.ts                  # Image serving from R2
├── sitemap.ts                 # SEO sitemap generation
└── robots.ts                  # robots.txt generation
```

### API Handler Pattern

Each API handler follows a consistent pattern:

1. **Authentication first** - Check auth before processing
2. **Method dispatch** - Route by HTTP method (GET, POST, PUT, DELETE)
3. **Validation** - Validate required fields and data types
4. **Database operations** - Use D1 prepared statements
5. **Cache invalidation** - Call `invalidateCache()` after mutations
6. **Error handling** - Wrap in try/catch, use structured logging

Example structure:

```typescript
export async function handleXxxApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      // Fetch logic
    }
    if (request.method === "POST") {
      // Create logic with invalidateCache()
    }
    // ... PUT, DELETE
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (error) {
    logger.error("Xxx API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
```

### D1 Transactions

For operations requiring data integrity across multiple tables, use `env.DB.batch()`:

```typescript
const statements = [
  env.DB.prepare("INSERT INTO users ...").bind(...),
  env.DB.prepare("INSERT INTO profiles ...").bind(...),
];
const results = await env.DB.batch(statements);
```

This pattern is used in `users.ts` for creating users with profiles and instruments atomically.

## Data Layer

### Cloudflare Bindings

| Binding     | Type | Name                   | Purpose                         |
| ----------- | ---- | ---------------------- | ------------------------------- |
| `env.DB`    | D1   | `amis-harmonie-db`     | SQLite database                 |
| `env.R2`    | R2   | `amis-harmonie-images` | Image storage                   |
| `env.CACHE` | KV   | `amis-harmonie-cache`  | Page caching + version tracking |

Access via: `import { env } from "cloudflare:workers";`

### Database Access Pattern

Direct D1 prepared statements (no ORM):

```typescript
const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();

const results = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all<Event>();
```

### KV-Based Page Caching

The caching layer provides:

1. **Versioned cache keys** - Build version + data version for cache busting
2. **Automatic invalidation** - Increment version on data mutations
3. **Path-based rules** - Skip caching for admin/musician/API routes
4. **TTL management** - 24-hour default expiration

Cache workflow:

1. Incoming GET request checks `shouldCachePath()`
2. If cacheable, try `getCachedResponse()` using versioned key
3. Cache miss proceeds to app handler
4. On response, `cacheResponse()` stores HTML with headers
5. Mutations call `invalidateCache()` to bump version

## Frontend Architecture

### Server vs Client Components

**Server Components (default)**

- No directive needed
- Access database directly
- No JavaScript bundle impact
- Used for: pages, layouts, Document

**Client Components**

- Add `"use client"` at file top
- Use for: state, effects, event handlers, browser APIs
- Naming convention: `ComponentNameClient`

### Component Organization

```
src/app/components/
├── ui/                        # Low-level primitives (Radix-based)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
└── shared/                    # Reusable domain components
    ├── InstrumentEditor.tsx   # Multi-instrument editing
    └── AvatarUploader.tsx     # Avatar upload with preview
```

### Shared Components

**InstrumentEditor**

A reusable component for managing a list of instruments with:

- Dynamic add/remove
- Fields: instrument name, start date, conservatory level
- Used in admin user management and musician profile

**AvatarUploader**

Image upload component with:

- Drag-and-drop support
- Image preview
- R2 upload integration

## Key Patterns

### Authentication Flow

Magic-link email authentication with two roles:

- `ADMIN` - Full admin access
- `SUPER_ADMIN` - Can create/delete users
- `MUSICIAN` - Musician portal access

Middleware pattern:

```typescript
const auth = await adminAuthMiddleware({ request });
if (auth instanceof Response) return auth; // Redirect if not authenticated
// auth.email and auth.role available
```

### Structured Logging

Centralized logging via `src/lib/logger.ts`:

```typescript
import { logger, getRequestLogContext } from "@/lib/logger";

// Error logging with context
logger.error("Database error:", error, getRequestLogContext(request));

// Info logging
logger.info("User created", { userId: result.id });
```

Features:

- Configurable log levels (debug, info, warn, error)
- Environment-based defaults (debug in dev, info in prod)
- JSON structured output
- Error stack trace capture

### Routing

All routes defined in `src/worker.tsx` using RedwoodSDK:

**Page routes:**

```typescript
render(Document, [layout(Layout, [route("/", Home), route("/about", About)])]);
```

**API routes:**

```typescript
route("/api/events", ({ request }) => handleEventsApi(request));
```

**Protected routes:**

```typescript
route("/admin", async ({ request }) => {
  const auth = await adminAuthMiddleware({ request });
  if (auth instanceof Response) return auth;
  return <AdminDashboardPage email={auth.email} role={auth.role} />;
});
```

### Error Handling

Consistent error response format:

```typescript
// Validation error
return new Response(JSON.stringify({ error: "Field required" }), {
  status: 400,
  headers: { "Content-Type": "application/json" },
});

// Auth error
return new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "Content-Type": "application/json" },
});

// Server error (with logging)
logger.error("Operation failed:", error);
return new Response(JSON.stringify({ error: "Internal server error" }), {
  status: 500,
  headers: { "Content-Type": "application/json" },
});
```

### Type Safety

- Strict TypeScript mode enabled
- Database types in `src/db/types.ts`
- Generic type parameters for D1 queries: `.first<User>()`
- No `any` or `@ts-ignore` allowed

## Rate Limiting

API endpoints that accept public submissions use rate limiting:

```typescript
route("/api/contact", {
  post: async ({ request }) => {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    return handleContactSubmission(request);
  },
});
```

## Environment Configuration

Log level can be configured via `LOG_LEVEL` environment variable:

```
LOG_LEVEL=debug  # debug, info, warn, error
```

Default: `debug` in development, `info` in production.

## Build and Deployment

- **Build**: Vite 7 with TypeScript
- **Runtime**: Cloudflare Workers
- **Deployment**: `npm run release` (build + wrangler deploy)
- **Cache version**: Derived from `BUILD_VERSION` env var

## File Naming Conventions

| Entity            | Pattern                      | Example                     |
| ----------------- | ---------------------------- | --------------------------- |
| Components        | PascalCase                   | `EventCard.tsx`             |
| Client components | PascalCase + `Client` suffix | `ContactAdminClient.tsx`    |
| API handlers      | camelCase `handleXxxApi`     | `handleEventsApi`           |
| UI primitives     | lowercase                    | `button.tsx`, `dialog.tsx`  |
| Utility files     | lowercase/kebab-case         | `admin-crud.ts`, `cache.ts` |
