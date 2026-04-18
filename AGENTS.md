<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Startup (MUST follow in order)

1. Start PostgreSQL: `docker compose up -d db`
2. Sync schema: `npx prisma db push`
3. Run dev server: `npm run dev`

**Critical**: DATABASE_URL in `.env` must use standard PostgreSQL format:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/sap_reform?schema=public"
```
Do NOT use Prisma Accelerate format (`prisma+postgres://...`) unless deploying to PlanetScale/Accelerate.

## Commands

```bash
npm run dev      # Development server (port 3000)
npm run build   # Production build (standalone output)
npm run start   # Run production build
npm run lint    # ESLint
```

## Database

- **Prisma**: `npx prisma db push` syncs schema, `npx prisma studio` for GUI
- **Seed**: Already seeded. Uses `@prisma/extension-accelerate` in production only
- **Requires**: PostgreSQL 15

## Auth

- NextAuth v4 with Google OAuth
- Email whitelisting: `ALLOWED_EMAILS` env var or database `User` table
- Unauthenticated users redirected to `/login`

## API Routes

- `/api/entries` - Daily production entries (today only - past returns 403)
- `/api/production` - Production data
- `/api/sales` - Sales data
- `/api/master` - Master data
- `/api/cashflow` - Cash flow
- `/api/export` - Export data

## Testing

- Run API tests: `node tests/api-data-flow.js`
- Manual: Insert test data directly via DB → check dashboard: `docker exec sap_reform-db-1 psql -U postgres -d sap_reform -c "INSERT INTO ..."`

## Calculations

- All math logic centralized in `src/lib/calculations.ts`:
  - `calculateProductionTotals()` - sums 6 cages (b1Kg + b1pKg + b2Kg + b2pKg + b3Kg + b3pKg)
  - `calculateSalesRevenue()` - totalKg × hargaJual
  - `calculateSalesTotals()` - daily aggregates
  - `calculateCashFlowProfit()` - totalPenjualan - biayaPakan - biayaOperasional
  - `calculateDashboardStats()` - combines all stats for dashboard
- Use these functions in API routes and dashboard to keep math logic in one place

## UI Note

- Light mode only - dark mode media query in `globals.css` is disabled
- Use Tailwind CSS classes (v4)

## Git Integration

- **Remote**: https://github.com/Razerpoa/sap_reform
- **Protocol**: HTTPS with GitHub CLI credential helper
- **Setup**: Run `gh auth login` once, then:
  ```bash
  git config credential.helper '!gh auth git-credential'
  ```
- **Push**: `git push -u origin main`