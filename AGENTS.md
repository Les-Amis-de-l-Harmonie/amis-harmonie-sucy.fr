# AGENTS.md

## Build/Lint/Test Commands

- Lint: `npm run lint` (ESLint with next/core-web-vitals rules)
- Build: `npm run build` (Next.js build + sitemap generation)
- Dev server: `npm run dev` (Next.js development mode)
- Production start: `npm run start` (Next.js production server)
- Static export: `npm run export` (build + export + image optimization)
- Tests: No scripts in package.json. If Jest/Vitest present, use `npx jest path/to/test.js` for single test; search codebase for test files.

## Code Style Guidelines

- Language: JavaScript (no TypeScript); ES6+ syntax.
- Components: Functional React components with hooks (useState, useEffect, etc.).
- Imports: Relative for local files; absolute with @ aliases (e.g., `@layouts/Baseof`); group by type (React, next, local).
- Formatting: Prettier with Tailwind plugin; 2-space indent, single quotes, trailing commas.
- Naming: PascalCase for components/files; camelCase for variables/functions; kebab-case for CSS classes (Tailwind).
- Error Handling: Try-catch for async ops; log errors with console.error; no unhandled promises.
- Styling: Primary Tailwind CSS; SCSS for custom utilities/components in /styles/.
- Conventions: Follow Next.js patterns (pages router); no inline styles; optimize images with ExportedImage.
- Linting: Enforce via ESLint; no unused vars/imports; accessible code (core-web-vitals).
- Other: No emojis/comments unless requested; mimic existing patterns in layouts/ and pages/.
