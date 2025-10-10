# AGENTS.md

## Build/Lint/Test Commands

- Lint: `npm run lint` (ESLint with next/core-web-vitals rules)
- Build: `npm run build` (Next.js build + sitemap generation)
- Dev server: `npm run dev` (Next.js development mode)
- Production start: `npm run start` (Next.js production server)
- Static export: `npm run export` (build + export + image optimization)
- Tests: No test scripts in package.json. Playwright detected in dependencies; search for test files or use `npx playwright test` if present.

## Code Style Guidelines

- Language: TypeScript with React; strict: false in tsconfig.
- Components: Functional React components with hooks; TypeScript interfaces for props.
- Imports: Absolute with @ aliases (@layouts/_, @components/_, @hooks/_, @lib/_); relative for local files; group by type (React, next, external, local).
- Formatting: Prettier with Tailwind plugin; 2-space indent, single quotes, trailing commas; EditorConfig enforced.
- Naming: PascalCase for components/files; camelCase for variables/functions; kebab-case for CSS classes (Tailwind).
- Types: Use TypeScript interfaces/types; NextPage for page components; React.FC optional.
- Error Handling: Try-catch for async ops; console.error for logging; no unhandled promises.
- Styling: Primary Tailwind CSS with class-variance-authority; no inline styles; optimize images with ExportedImage/next-image-export-optimizer.
- Conventions: Next.js pages router; Radix UI components in @layouts/components/ui/; no emojis/comments unless requested.
- Linting: ESLint with next/core-web-vitals; no unused vars/imports; accessible code enforced.
