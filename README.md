# Amis de l'Harmonie de Sucy - Website

French community music association website built with RedwoodSDK on Cloudflare Workers.

## Tech Stack

- **Framework**: RedwoodSDK 1.0.0-beta.47 (React full-stack on Cloudflare Workers)
- **Frontend**: React 19 with Server Components, Tailwind CSS 4
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (images)
- **Cache**: Cloudflare KV
- **Language**: TypeScript 5.9 (strict mode)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for deployment)
- Resend API key (for email authentication)

### Environment Setup

1. **Clone the repository**:
   ```shell
   git clone <repository-url>
   cd amis-harmonie
   npm install
   ```

2. **Configure environment variables**:
   ```shell
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   - `RESEND_API_KEY`: Get from [Resend](https://resend.com/api-keys) for magic link authentication emails

3. **Configure Cloudflare bindings** (for deployment):
   - D1 Database: `amis-harmonie-db`
   - R2 Bucket: `amis-harmonie-storage`
   - KV Namespace: `amis-harmonie-cache`
   
   See `wrangler.jsonc` for binding configuration.

### Development

```shell
npm run dev
```

Point your browser to `http://localhost:5173/`

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run types` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix linting errors |
| `npm run format` | Format code with Prettier |
| `npm run release` | Build and deploy to Cloudflare Workers |

### Project Structure

```
src/
  app/
    pages/          # Page components (server components)
    admin/          # Admin dashboard
    musician/       # Musician portal
    api/            # API handlers
    components/     # Shared components
  db/
    schema.sql      # Database schema
    types.ts        # TypeScript interfaces
  lib/              # Utilities
  worker.tsx        # Entry point and routing
```

## Further Reading

- [RedwoodSDK Documentation](https://docs.rwsdk.com/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
- [Project Architecture](./AGENTS.md) - Detailed technical documentation
