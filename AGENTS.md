# SAP REFORM - Agent Instructions

## Quick Start

```bash
# 1. Start database
docker compose up -d db

# 2. Generate Prisma client (after schema changes)
npx prisma generate

# 3. Push schema to database
npx prisma db push

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
- **Production** - Daily entries with hardcoded cage columns (b1Kg, b1pKg, b2Kg, etc.)

## Cage Naming Convention

Cage keys use lowercase + `p` suffix for plus variants:
```
B1 → b1    B1+ → b1p    B2 → b2    B2+ → b2p    B3 → b3    B3+ → b3p
```

Production table columns follow pattern: `{cageKey}{field}` (e.g., `b1Kg`, `b1pJmlTelur`, `b2Pct`)

## Important Notes

- **DATABASE_HOST**: Local uses `localhost`, Docker uses `db`. `docker-compose.yml` hardcodes `DATABASE_HOST: db`.
- **Prisma client**: After schema changes, must run `npx prisma generate` before building.
- **Seed script**: Uses `tsx` not `ts-node`. Run after `prisma db push`.
- **Dark mode**: Disabled in `globals.css` (light mode only).
- **Production Prisma**: Uses `@prisma/extension-accelerate` (local does not).

## Adding New Cages

1. Update `prisma/schema.prisma` - add columns to `Production` model following naming pattern
2. Add calculation logic in `src/lib/calculations.ts`
3. Update API validation in `src/app/api/production/route.ts`
4. Update UI in `src/app/(dashboard)/entry/page.tsx` (`CATS` array) and `produksi/page.tsx` (`CAGE_CONFIG`)
5. Push schema: `npx prisma db push`
6. Seed: `npx tsx prisma/seed.ts`