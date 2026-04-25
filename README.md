# 🥚 SAP REFORM - Layer Egg Farm Management

SAP REFORM is a real-time, production-ready dashboard for layer egg farms. It centralizes production tracking, sales operations, and financial cash flow into a single, high-performance interface.

![Dashboard Preview](https://github.com/Razerpoa/sap_reform/raw/main/public/dashboard-preview.png)

## 🚀 Key Features

### 📊 Dynamic Dashboard
- **Real-time Analytics**: Instant visibility into production volume, sales revenue, and net profit.
- **Visual Trends**: High-fidelity charts for production performance and financial health.
- **Smart Stat Cards**: Dynamic indicators (Trending Up/Down) for profit and production efficiency.

### 🐓 Production Management
- **Cage-level Detail**: Track production across dynamic cages (loaded from database).
- **Efficiency Metrics**: Automatic calculation of kg production, feed metrics, and cost analysis.
- **Flexible Layout**: Add new cages without code changes - just add to database.

### 💰 Sales & Inventory
- **Automated Billing**: Instant subtotal calculation based on central pricing and profit margins.
- **Inventory Tracking**: Real-time stock monitoring from daily production and transactions.

### 🏦 Financial Cash Flow
- **Automated Profit Sync**: Sales revenue automatically updates the cash flow reports.
- **Comprehensive Overhead**: Tracks operational costs, feed costs, salaries (dynamic), and dividends.
- **Liquidity Monitoring**: Live balance tracking for bank accounts and physical cash.
- **Expense Tracking**: Separate OtherExpense table for miscellaneous costs.

## 🛠️ Tech Stack

- **Core**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js v4](https://next-auth.js.org/) (Google OAuth)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites
- Node.js 22+
- Docker (for PostgreSQL)
- Google Cloud Project (for OAuth)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Razerpoa/sap_reform.git
   cd sap_reform
   ```

2. **Setup Environment**:
   Create a `.env` file:
   ```env
   DATABASE_HOST=localhost
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=password
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generate-a-secure-secret>
   GOOGLE_CLIENT_ID=<from Google Console>
   GOOGLE_CLIENT_SECRET=<from Google Console>
   ALLOWED_EMAILS=user@example.com
   ```

3. **Spin up Database**:
   ```bash
   docker compose up -d db
   npx prisma db push
   npm run seed
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

### User Roles

The app has two access levels:

| Role | Access Level |
|------|-------------|
| **ADMIN** | Full create/edit/delete access on all pages |
| **WHITELISTED** | Read-only access (cannot modify any data) |

Users in `ALLOWED_EMAILS` get ADMIN by default. To change a user's role:

```bash
npm run set-role user@example.com whitelisted
npm run set-role user@example.com admin
```

Note: Users must sign in first before their role can be updated.

## 🐳 Docker Production

```bash
# Build and run
docker compose up -d --build

# View logs
docker compose logs -f app
```

The app runs on `http://localhost:3000`.

## 🧪 Development & Testing

- **API Tests**: `npm run test:api`
- **Prisma Studio**: `npx prisma studio`
- **Math Logic**: Centralized in `src/lib/calculations.ts`

## 📄 License

[GNU General Public License v3.0 (GPL-3.0)](LICENSE) - Free to use and modify.

---

Built with 💙 for every farm on earth.