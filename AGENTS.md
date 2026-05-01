# SAP REFORM — Agent Instructions

## Quick Start

```bash
# 1. Start database
docker compose up -d db

# 2. Generate Prisma client (after schema changes — ALWAYS do this before build)
npx prisma generate

# 3. Push schema to database (use --accept-data-loss for breaking changes)
npx prisma db push --accept-data-loss

# 4. Seed data
npx tsx prisma/seed.ts

# 5. Start dev server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 (uses `nodemon`, watches `src`) |
| `npm run build` | Production build (no separate typecheck step) |
| `npm run lint` | ESLint |
| `npm run seed` | Seed database |
| `npm run set-role <email> <admin\|whitelisted>` | Set user role |
| `npm run test:api` | Run API integration tests (`tests/api-data-flow.js`) |
| `npx prisma studio` | Open Prisma GUI |

## Prisma Schema → Database

**Command order after ANY schema change:**

```bash
npx prisma generate && npx prisma db push --accept-data-loss
```

Then seed if needed: `npx tsx prisma/seed.ts`

## Prisma Client Setup

`src/lib/prisma.ts` creates the client differently per environment:
- **Local dev**: `Pool` + `PrismaPg` adapter (no accelerate)
- **Production**: `@prisma/extension-accelerate` with `accelerateUrl`
- Detection: checks if URL starts with `prisma://` or `prisma+postgres://`

The schema.prisma `datasource` has no `url` — it relies on env vars.

## Database Host

- Local development: `DATABASE_HOST=localhost`
- Docker: `docker-compose.yml` hardcodes `DATABASE_HOST: db` for the app container
- The seed script uses `DATABASE_HOST` from `.env`

## Cage Naming — Dynamic, Not Hardcoded

Cage names (B1, B1+, etc.) come from the `CageMaster` table's `kandang` field. No cage names are hardcoded in code. To add a new cage: insert into `CageMaster` via the **Data Master** tab — the Production form auto-renders it without code changes.

## Stock & Stats Calculation

- **`cageData`** / **`cageSummary`** in `Production` table: keys are cage names (from CageMaster). Structure per cage:
  ```json
  {
    "B1": {
      "rows": [{ "peti": false, "tray": 0, "butir": 0 }, ...],
      "extra": { "extraTray": 0, "extraButir": 0, "extraKg": 0 }
    }
  }
  ```
- **Stats calc**:
  - `totalKg` per cage = `rows.filter(r => r.peti).length × 15` + `extra.extraKg`
  - `totalButir` per cage = `rows.sum(r => (r.tray × 30) + r.butir)` + `(extra.extraTray × 30) + extra.extraButir`
- **Cumulative Stock**: Tracked in `Production` table via `productionKg` and `soldKg` fields. These are updated for all records on every production/sales save via the `recalculateStock()` helper in `src/lib/data.ts`.

## User Roles

| Role | Access |
|------|--------|
| ADMIN | Full CRUD on all entry pages |
| WHITELISTED | Read-only |

- Users in `ALLOWED_EMAILS` env var default to ADMIN on first sign-in.
- Role enforcement: both API (403 on write) and frontend (UI hidden/disabled).
- `npm run set-role` requires the user to have signed in first (creates the User record).

## Docker Startup Idempotency

`docker-compose.yml` app service checks if `postgres_data/` folder exists before running migrations. If it exists, it skips `prisma db push` and `prisma db seed` on restart.

## Testing

`tests/api-data-flow.js` — plain Node.js script (not a test runner). Requires a running dev server. Tests production POST/GET, cashflow POST/GET, and dashboard load.

## Tech Stack

- Next.js 16 (App Router) · Prisma 7 · PostgreSQL · Tailwind CSS v4
- NextAuth v4 (Google OAuth) · Zod v4 · Recharts · Lucide React
- `tsx` for dev scripts (not `ts-node`) · `nodemon` for dev hot reload