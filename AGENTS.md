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
| `npm run set-role <email> <admin\|whitelisted>` | Set user role |
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

## User Roles

The app has two access levels:

| Role | Access Level |
|------|-------------|
| ADMIN | Full CRUD on all entry pages |
| WHITELISTED | Read-only access to entire site |

### Managing Users

```bash
# Set user to whitelisted (read-only)
npm run set-role user@example.com whitelisted

# Set user to admin (full access)
npm run set-role user@example.com admin
```

- Users in `ALLOWED_EMAILS` default to ADMIN role
- Users must sign in first to be created in the database before their role can be changed
- Role check is enforced at both API level (403 for non-ADMIN write operations) and frontend level (UI elements hidden/disabled)

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

## Development Progress

### Done
- Schema: added `hargaSentral Float` to CageMaster, new `CageStock` model (id, date, kandang, openingKg, productionKg, soldKg, closingKg, @@unique([date, kandang])), `sourceCages String[]` to Sales
- Schema push: `npx prisma generate` + `npx prisma db push`
- API: `/api/stock/route.ts` — GET (fetch CageStock by date) + POST (upsert with lazy openingKg from yesterday)
- API: `/api/master/route.ts` — added `hargaSentral` to Zod schema, added PATCH endpoint for global hargaSentral update
- API: `/api/sales/route.ts` — added `sourceCages` as array of `{kandang, jmlPeti, jmlKg}` objects
- Data layer: `src/lib/data.ts` — added `syncCageStock()` helper, production save syncs CageStock (productionKg), sales save syncs CageStock (soldKg proportional per cage)
- Data Master tab: dedicated global hargaSentral card with own Simpan button (updates all cages via PATCH)
- Produksi tab dark card: butir/kg from gross cageData (globalStats), peti/sisa from net formula: `openingKg + cageData gross - soldKg` (netStats) — auto-updates on unsaved edits, label stays "Total Hari Ini"
- Per-cage headers in Produksi: net stock badge (e.g., "12 peti available")
- Penjualan tab: Stok dark card always shows "X peti | Y kg" per cage (no unit toggle)
- Penjualan form redesigned: Pilih Kandang modal → stacked selected-cage cards → total summary → Customer + Harga Jual inputs → Add Sale Record
- pilihKandang button moved below input fields, Sisa Kg input removed
- Validation: checks available peti >= requested per cage before save, shows error if insufficient
- Type fix: `parseFloat(String(extra?.extraKg))` for extraKg handling in ProductionForm
- Modal: removed blur effect from Pilih Kandang modal (plain dark overlay, no backdrop-blur)

### In Progress
- None

### Blocked
- None