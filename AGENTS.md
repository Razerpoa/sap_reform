# SAP REFORM - Agent Instructions

## Quick Start

```bash
# 1. Start database (if not running)
docker compose up -d db

# 2. Sync Prisma schema
npx prisma db push

# 3. Start dev server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (standalone) |
| `npm run lint` | ESLint |
| `npm run test:api` | Run API tests |
| `npx prisma studio` | Open Prisma GUI |

## Environment

- **DATABASE_URL**: `postgresql://postgres:password@localhost:5432/sap_reform?schema=public` (local)
- **Auth**: Google OAuth with email whitelist (`ALLOWED_EMAILS` or `User` table)
- **Env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (not `GOOGLE_ID`/`GOOGLE_SECRET`)

## Architecture

- **Next.js 16** with App Router (src/app)
- **Prisma** - schema in `prisma/schema.prisma`
- **Auth** - NextAuth v4, config in `src/lib/auth.ts`
- **Calculations** - `src/lib/calculations.ts` (centralized math logic)
- **API Routes**:
  - `/api/production` - Production data
  - `/api/sales` - Sales data
  - `/api/master` - Master data
  - `/api/cashflow` - Cash flow
  - `/api/export` - Export data
- **Pages**:
  - `/dashboard` - Main dashboard
  - `/entry` - Daily entry form
  - `/login` - Login page (auth group)

## Testing

- Run API tests: `npm run test:api`
- Insert test data directly: `docker exec sap_reform-db-1 psql -U postgres -d sap_reform -c "INSERT INTO ..."`

## Important Notes

- Dark mode is disabled in `globals.css` (light mode only)
- Production uses `@prisma/extension-accelerate` (local does not)
- Cage fields: b1Kg, b1pKg, b2Kg, b2pKg, b3Kg, b3pKg (6 cages)