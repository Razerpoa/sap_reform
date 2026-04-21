# SAP REFORM - Agent Instructions

## Quick Start

```bash
# 1. Start database
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
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:api` | Run API tests |
| `npx prisma studio` | Open Prisma GUI |

## Environment (.env)

```env
DATABASE_HOST=localhost        # Use "localhost" for local, "db" for Docker
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret>
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
ALLOWED_EMAILS=user@example.com
```

## Docker Production

```bash
# Build and run
docker compose up -d --build

# View logs
docker compose logs -f app
```

**Critical**: `docker-compose.yml` hardcodes `DATABASE_HOST: db` to override any `.env` file.

## Architecture

- **Next.js 16** with App Router (src/app)
- **Prisma** - schema in `prisma/schema.prisma`, connection config in `prisma.config.ts`
- **Auth** - NextAuth v4, config in `src/lib/auth.ts`
- **Calculations** - `src/lib/calculations.ts` (centralized math logic)
- **API Routes**:
  - `/api/production` - Production data
  - `/api/sales` - Sales data
  - `/api/master` - Master data
  - `/api/cashflow` - Cash flow
  - `/api/export` - Export data
- **Pages**:
  - `/` → redirects to `/login` (auth protected)
  - `/entry` - Daily entry form
  - `/workers` - Worker management
  - `/export` - Data export

## Testing

- Run API tests: `npm run test:api`
- Insert test data directly: `docker exec db psql -U postgres -d sap_reform -c "INSERT INTO ..."`

## Important Notes

- **DATABASE_HOST quirk**: Local needs `localhost`, Docker needs `db`. The docker-compose.yml hardcodes `DATABASE_HOST: db` to override local `.env`.
- Dark mode is disabled in `globals.css` (light mode only)
- Production uses `@prisma/extension-accelerate` (local does not)
- Cage fields: b1Kg, b1pKg, b2Kg, b2pKg, b3Kg, b3pKg (6 cages)