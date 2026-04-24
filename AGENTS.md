# SAP REFORM - Agent Instructions

## Quick Start

```bash
# 1. Start database
docker compose up -d db

# 2. Generate Prisma client (after schema changes)
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
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build + typecheck |
| `npm run lint` | ESLint |
| `npm run seed` | Seed database |
| `npm run test:api` | Run API tests |
| `npx prisma studio` | Open Prisma GUI |

## Architecture

- **Next.js 16** with App Router (`src/app`)
- **Prisma** - schema in `prisma/schema.prisma`
- **Auth** - NextAuth v4 (`src/lib/auth.ts`)
- **Calculations** - `src/lib/calculations.ts` (centralized math logic)
- **Data layer** - `src/lib/data.ts` (all database queries go here)

### API Routes
| Endpoint | Purpose |
|----------|---------|
| `/api/production` | Daily production data |
| `/api/master` | CageMaster CRUD (GET, POST, DELETE) |
| `/api/sales` | Sales transactions |
| `/api/cashflow` | Cash flow tracking |
| `/api/workers` | Worker management |
| `/api/export` | Excel export |

### Database
- **CageMaster** - Groups of cages (B1, B1+, etc.) with calculated fields
  - `gramEkor` = jmlPakan / jmlAyam (feed per chicken)
  - `beratPakan` = jmlPakan * hargaPakan (total feed cost)
  - `volEmber` = jmlPakan / jmlEmber (volume per bucket)
- **Production** - Daily entries with JSONB fields (`cageData`, `cageSummary`)

## Cage Naming Convention

Cage names are now **dynamic** - loaded from CageMaster table. No hardcoded keys.

## Data Structure (JSONB)

### cageData / cageSummary
```json
{
  "B1": {
    "rows": [
      { "peti": false, "tray": 0, "butir": 0 },
      { "peti": false, "tray": 0, "butir": 0 },
      { "peti": false, "tray": 0, "butir": 0 }
    ],
    "extra": { "extraTray": 0, "extraButir": 0, "extraKg": 0 }
  }
}
```

### Global Stats Calculation
- `totalKg` = sum(rows.peti × 15) + sum(extra.extraKg)
- `totalTray` = sum(rows.tray) + sum(extra.extraTray)
- `totalButir` = sum(rows.butir) + sum(extra.extraButir)

## Important Notes

- **DATABASE_HOST**: Local uses `localhost`, Docker uses `db`. `docker-compose.yml` hardcodes `DATABASE_HOST: db`.
- **Prisma client**: After schema changes, must run `npx prisma generate` before building.
- **Seed script**: Uses `tsx` not `ts-node`. Run after `prisma db push`.
- **Dark mode**: Disabled in `globals.css` (light mode only).
- **Production Prisma**: Uses `@prisma/extension-accelerate` (local does not).
- **Dynamic Cages**: Production table uses JSONB (`cageData`, `cageSummary`) - cage names come from CageMaster.

## Adding New Cages

1. Add new cage to `CageMaster` table via the **Data Master** tab in the app
2. The Production form automatically renders the new cage card (no code changes needed)

## Component Structure

```
src/
├── app/(dashboard)/entry/page.tsx    (wrapper + navigation)
├── components/
│   ├── InputField.tsx
│   ├── production/
│   │   ├── types.ts
│   │   └── ProductionForm.tsx
│   ├── cashflow/
│   │   └── CashFlowForm.tsx
│   ├── sales/
│   │   └── SalesSection.tsx
│   └── master/
│       └── MasterForm.tsx
```