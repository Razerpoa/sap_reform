# SAP REFORM — Agent Instructions

## Quick Start

```bash
docker compose up -d db                    # Start PostgreSQL
npx prisma generate                         # After ANY schema change
npx prisma db push --accept-data-loss       # Push schema to DB
npx tsx prisma/seed.ts                      # Seed cage data + admin users
npm run dev                                 # Dev server on port 3000
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | `nodemon --watch src --ext ts,tsx --exec 'next dev'` (hot reload) |
| `npm run build` | `next build` (no separate typecheck step) |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run test:api` | `NODE_ENV=test node tests/api-data-flow.js` |
| `npm run seed` | `npx tsx prisma/seed.ts` |
| `npm run set-role <email> <admin\|whitelisted>` | Change user role (user must exist first) |
| `npm run import <table> <csv> [--wipe-all]` | Bulk CSV import |
| `npx prisma studio` | Prisma GUI |

## Schema Changes

**Always run in this order:**
```bash
npx prisma generate && npx prisma db push --accept-data-loss
```
The schema has no `datasource.url` — it relies on env vars and `prisma.config.ts` builds the URL from `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `DATABASE_HOST`.

## Prisma Client

`src/lib/prisma.ts` creates the client adaptively:
- **Local dev:** `pg.Pool` + `@prisma/adapter-pg` (direct)
- **Production:** `PrismaClient` with `accelerateUrl` + `withAccelerate()` extension
- Detection: checks if URL starts with `prisma://` or `prisma+postgres://`

## Database Host Quirk

| Context | `DATABASE_HOST` value |
|---------|----------------------|
| Local dev server | `localhost` |
| Docker app container | `db` (hardcoded in compose) |
| Standalone scripts (`prisma/seed.ts`, `scripts/`, `check-stock.ts`) | From `.env` |

## Architecture

- **App Router** under `src/app/`. Dashboard pages in `(dashboard)/`, API routes in `api/`.
- **All API routes** use the `withAuth` wrapper from `src/lib/api-wrapper.ts`:
  ```ts
  export async function POST(request: Request) {
    return withAuth(async () => { ... handler ... }, { requireAdmin: true });
  }
  ```
  Handles session, role check (403 on non-ADMIN writes), and error handling. Admins bypass date restrictions on past entries. `TESTING_MODE=true` bypasses auth entirely (test session is ADMIN).

- **`output: 'standalone'`** in `next.config.ts` — build produces `.next/standalone/` for Docker.
- **Docker CMD** runs `prisma db push && prisma db seed && node server.js` on every startup.

## Tests

| File | How to run | Status |
|------|-----------|--------|
| `tests/api-data-flow.js` | `npm run test:api` (needs dev server running) | **Active** — plain Node.js tests |
| `tests/api-only.spec.js` | `TESTING_MODE=true node tests/api-only.spec.js` | **Active** — standalone, no server needed |
| `tests/api-e2e.spec.ts` | Playwright | **SKIPPED** (old flat format) |
| `tests/data-flow.spec.ts` | Playwright | **SKIPPED** (old flat format) |

Playwright config (`playwright.config.ts`) autostarts dev server with `TESTING_MODE=true`.

## CSV Import

```bash
npm run import <table> <file.csv> [--wipe-all]
```

Tables: `CageMaster` (upserts by `kandang`), `Worker`, `OtherExpense`, `Sales`, `CashFlow`, `Production`.

**Production CSV** special behavior: one file per cage, merges cage data by date (other cages preserved). Validates `Kandang` against `CageMaster`. Auto-runs `recalculateStock()` after import.

Date formats accepted: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`.

## Dynamic Cage Names

Cage names come from `CageMaster.kandang` — **never hardcoded**. Adding a cage in **Data Master** tab auto-renders it in the Production form.

## Stock & State

### cageData JSON structure (in Production table)
```json
{
  "B1": {
    "rows": [{ "peti": false, "tray": 0, "butir": 0 }, ...],
    "extra": { "extraTray": 0, "extraButir": 0, "extraKg": 0 }
  }
}
```
- `peti=true` each = 15kg
- `totalKg` = count(peti) × 15 + extraKg
- `totalButir` = sum((tray × 30) + butir) + (extraTray × 30) + extraButir

### Cumulative Stock

`Production.productionKg` and `Production.soldKg` store **all-time running totals** (not per-day). Updated on every production or sales save via `recalculateStock()` in `src/lib/stock.ts`. **Never edit these fields directly.**

### Key lib files

| File | Role |
|------|------|
| `src/lib/data.ts` | Centralized CRUD (saveProductionData, saveSalesData, etc.) |
| `src/lib/calculations.ts` | All math (kg, butir, profit, dashboard stats) |
| `src/lib/stock.ts` | Cumulative stock recalc |
| `src/lib/date-utils.ts` | WIB (Asia/Jakarta) timezone helpers |
| `src/lib/utils.ts` | Generic helpers |

## User Roles

| Role | Access |
|------|--------|
| `ADMIN` | Full CRUD on all pages; can edit past dates |
| `WHITELISTED` | Read-only (API 403 + UI disabled) |

- First sign-in with email in `ALLOWED_EMAILS` env var → creates `ADMIN`.
- Set-role script requires the user record to exist (must have signed in first).

## Git

```bash
npm run build                    # verify first
git add <files>
git commit -m "type(scope): message"
```
Conventional commits: `feat:`, `fix:`, `refactor:`, `perf:`, etc. Commit immediately when working.

## Misc

- **Time zone:** WIB (Asia/Jakarta) for all date logic — `getWIBDateString()` in `date-utils.ts`.
- **Lockfile:** `package-lock.json` (npm, not yarn/pnpm). Use `npm ci` in Docker.
- **Tailwind v4** with `@tailwindcss/postcss` (PostCSS config, no `tailwind.config`).
- **nodemon** watches `src/` directory for hot reload during dev.
- **check-stock.ts** at repo root is a standalone debug script (run with `npx tsx check-stock.ts`).
- **`data_insert/` and `postgres_data/`** are gitignored (local data/DB volume).
