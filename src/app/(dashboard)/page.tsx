import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { calculateDashboardStats } from "@/lib/calculations";
import { DashboardClient } from "./DashboardClient";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [productionEntries, cashFlowEntries, salesEntries] = await Promise.all([
    prisma.production.findMany({
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.cashFlow.findMany({
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.sales.findMany({
      orderBy: { date: "desc" },
      take: 30,
    })
  ]);

  const stats = calculateDashboardStats(productionEntries, cashFlowEntries, salesEntries);

  const hasProductionToday = productionEntries.some(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.date.toISOString().split('T')[0] === today;
  });

  const chartData = productionEntries.slice().reverse().map((p: any) => {
    const cf = cashFlowEntries.find((c: any) => c.date.toISOString().split('T')[0] === p.date.toISOString().split('T')[0]);
    return {
      date: p.date,
      totalKg: p.totalKg,
      profit: cf ? (cf.totalPenjualan - cf.biayaPakan - cf.biayaOperasional) : 0,
      expenses: cf ? (cf.biayaPakan + cf.biayaOperasional) : 0,
    };
  });

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        stats={stats}
        hasProductionToday={hasProductionToday}
        chartData={chartData}
        salesEntries={salesEntries}
        productionEntries={productionEntries}
        cashFlowEntries={cashFlowEntries}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="h-48 bg-slate-200 rounded-[32px] animate-pulse"></div>
      <div className="space-y-6">
        <div className="h-64 bg-slate-200 rounded-[32px] animate-pulse"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-200 rounded-[32px] animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
