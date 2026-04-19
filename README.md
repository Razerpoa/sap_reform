# 🥚 SAP REFORM - Layer Egg Farm Management

SAP REFORM is a premium, real-time management dashboard for layer egg farms. It centralizes production tracking, sales operations, and financial cash flow into a single, high-performance interface.

![Dashboard Preview](https://github.com/Razerpoa/sap_reform/raw/main/public/dashboard-preview.png)

## 🚀 Key Features

### 📊 Dynamic Dashboard
- **Real-time Analytics**: Instant visibility into production volume, sales revenue, and net profit.
- **Visual Trends**: High-fidelity charts for production performance and financial health.
- **Smart Stat Cards**: Dynamic indicators (Trending Up/Down) for profit and production efficiency.

### 🐓 Production Management
- **Cage-level Detail**: Track production across 6 distinct cages (B1, B1+, B2, B2+, B3, B3+).
- **Efficiency Metrics**: Automatic calculation of percentage production, Feed Conversion (FC), and Cost of Production (HPP).

### 💰 Sales & Inventory
- **Automated Billing**: Instant subtotal calculation based on central pricing and profit margins.
- **Inventory Tracking**: Real-time stock monitoring from daily production and transactions.

### 🏦 Financial Cash Flow
- **Automated Profit Sync**: Sales revenue automatically updates the cash flow reports.
- **Comprehensive Overhead**: Tracks operational costs, feed costs, salaries for 5+ staff, and dividends.
- **Liquidity Monitoring**: Live balance tracking for bank accounts and physical cash.

## 🛠️ Tech Stack

- **Core**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js v4](https://next-auth.js.org/) (Google OAuth)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Razerpoa/sap_reform.git
   cd sap_reform
   ```

2. **Setup Environment**:
   Create a `.env` file from `.env.example`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/sap_reform?schema=public"
   GOOGLE_ID="your_google_id"
   GOOGLE_SECRET="your_google_secret"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your_secret"
   ALLOWED_EMAILS="user1@example.com,user2@example.com"
   ```

3. **Spin up Database**:
   ```bash
   docker compose up -d db
   npx prisma db push
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Development & Testing

- **API Tests**: `npm run test:api`
- **Math Logic**: Centralized in `src/lib/calculations.ts`
- **Data Layer**: Centralized in `src/lib/data.ts`

## 📄 License
This project is private and intended for internal use at SAP Farm.
