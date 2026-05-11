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
| `npm run import <table> <csv-file> [--wipe-all]` | Import CSV data into table |
| `npm run test:api` | Run API integration tests (`tests/api-data-flow.js`) |
| `npx prisma studio` | Open Prisma GUI |

## CSV Import

Import data from CSV files into the database.

```bash
npm run import <table> <csv-file> [--force]
```

**Options:**
- `--wipe-all` - Clear existing data in the table before import

**Supported Tables:**

| Table | Required Columns | Description |
|-------|-----------------|-------------|
| `CageMaster` | `kandang` | Cage configuration |
| `Worker` | `name` | Worker/employee list |
| `OtherExpense` | `date`, `amount`, `description` | Miscellaneous expenses |
| `Sales` | `date`, `customerName` | Sales records |
| `CashFlow` | `date` | Cash flow entries |
| `Production` | `Tanggal`, `Kandang` | Daily production data (one cage per file) |

**Examples:**
```bash
# Import cages (upserts by kandang)
npm run import CageMaster data/cages.csv

# Import workers
npm run import Worker data/workers.csv

# Import production (clears existing first)
npm run import Production data/production.csv --wipe-all

# Import sales
npm run import Sales data/sales.csv
```

**CSV Format Notes:**
- Date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, or `MM/DD/YYYY`
- Production: one CSV file per cage. Columns: `Tanggal`, `Kandang`, `Peti 1 Tray`, `Peti 1 Butir`, `Peti 1 Kg`, `Peti 2 Tray`, `Peti 2 Butir`, `Peti 2 Kg`, `Peti 3 Tray`, `Peti 3 Butir`, `Peti 3 Kg`, `Sisa Tray`, `Sisa Butir`, `Sisa Kg`. `Kandang` must exist in CageMaster. Multiple dates per file are supported. Import merges cage data per date (preserves other cages).
- Sample templates in `templates/` folder

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

## Docker Startup

On startup, the app container runs `prisma db push` (idempotent schema sync) and `prisma db seed` (idempotent — uses upserts). Both are safe to run on every restart.

## Testing

`tests/api-data-flow.js` — plain Node.js script (not a test runner). Requires a running dev server. Tests production POST/GET, cashflow POST/GET, and dashboard load.

## API Implementation Pattern

Most API routes follow a standardized pattern using the `withAuth` wrapper in `src/lib/api-wrapper.ts`. This centralized helper handles:
- **Session retrieval** (with `TESTING_MODE` support)
- **Role enforcement** (ADMIN required for writes, WHITELISTED for reads)
- **Generic error handling**

Example usage:
```ts
export async function POST(request: Request) {
  return withAuth(async () => {
    // Handler logic here...
  }, { requireAdmin: true });
}
```

## Tech Stack

- Next.js 16 (App Router) · Prisma 7 · PostgreSQL · Tailwind CSS v4
- NextAuth v4 (Google OAuth) · Zod v4 · Recharts · Lucide React
- `tsx` for dev scripts (not `ts-node`) · `nodemon` for dev hot reload