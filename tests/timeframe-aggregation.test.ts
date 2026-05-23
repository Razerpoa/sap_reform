/**
 * Test for dashboard data aggregation by timeframe
 * Aggregates production, cashflow, and sales data into intervals
 * Run with: npx tsx tests/timeframe-aggregation.test.ts
 */
import { aggregateDashboardData } from "../src/lib/calculations";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

function main() {
  console.log("Testing aggregateDashboardData...\n");

  // Sample data: 3 consecutive days
  const day1 = "2026-05-01";
  const day2 = "2026-05-02";
  const day3 = "2026-05-03";

  // Day 1: 1 peti (15kg)
  // Day 2: 1 peti (15kg) + 5kg extra = 20kg
  // Day 3: 10kg extra
  const sampleProduction: any[] = [
    { date: day1, cageData: { B1: { rows: [{ peti: true, tray: 0, butir: 0 }], extra: { extraKg: 0 } } } },
    { date: day2, cageData: { B1: { rows: [{ peti: true, tray: 0, butir: 0 }], extra: { extraKg: 5 } } } },
    { date: day3, cageData: { B1: { rows: [{ peti: false, tray: 0, butir: 0 }], extra: { extraKg: 10 } } } },
  ];

  // Cashflow: revenue - feed - ops = profit
  // Day 1: 1_000_000 - 500_000 - 100_000 = 400_000, expenses = 600_000
  // Day 2: 2_000_000 - 600_000 - 150_000 = 1_250_000, expenses = 750_000
  // Day 3: 1_500_000 - 400_000 - 80_000 = 1_020_000, expenses = 480_000
  const sampleCashflow: any[] = [
    { date: day1, totalPenjualan: 1_000_000, biayaPakan: 500_000, biayaOperasional: 100_000 },
    { date: day2, totalPenjualan: 2_000_000, biayaPakan: 600_000, biayaOperasional: 150_000 },
    { date: day3, totalPenjualan: 1_500_000, biayaPakan: 400_000, biayaOperasional: 80_000 },
  ];

  const sampleSales: any[] = [
    { date: day1, hargaSentral: 25_000, hargaJual: 27_000 },
    { date: day2, hargaSentral: 25_000, hargaJual: 27_500 },
    { date: day3, hargaSentral: 26_000, hargaJual: 28_000 },
  ];

  // Test 1: Daily aggregation — 3 consecutive days = 3 intervals
  const daily = aggregateDashboardData(sampleProduction, sampleCashflow, sampleSales, "daily");
  assert(daily.length === 3, "daily should have 3 intervals (3 consecutive days)");
  assert(daily[0].totalKg === 15, `day1 totalKg should be 15, got ${daily[0].totalKg}`);
  assert(daily[0].profit === 400_000, `day1 profit should be 400000, got ${daily[0].profit}`);
  assert(daily[0].expenses === 600_000, `day1 expenses should be 600000, got ${daily[0].expenses}`);
  assert(daily[0].avgHargaSentral === 25_000, `day1 avgHargaSentral should be 25000, got ${daily[0].avgHargaSentral}`);
  assert(daily[0].avgHargaJual === 27_000, `day1 avgHargaJual should be 27000, got ${daily[0].avgHargaJual}`);
  assert(daily[1].totalKg === 20, `day2 totalKg should be 20, got ${daily[1].totalKg}`);
  assert(daily[1].profit === 1_250_000, `day2 profit should be 1250000, got ${daily[1].profit}`);
  assert(daily[2].totalKg === 10, `day3 totalKg should be 10, got ${daily[2].totalKg}`);
  assert(daily[2].profit === 1_020_000, `day3 profit should be 1020000, got ${daily[2].profit}`);

  // Test 2: Monthly aggregation — all 3 days in May 2026
  const monthly = aggregateDashboardData(sampleProduction, sampleCashflow, sampleSales, "monthly");
  assert(monthly.length >= 1, "monthly should have at least 1 interval (May 2026)");
  // May 2026 has all 3 days
  const mayEntry = monthly.find((e) => {
    const d = e.date;
    return d.getFullYear() === 2026 && d.getMonth() === 4; // May = month 4 (0-indexed)
  });
  assert(mayEntry !== undefined, "should have a May 2026 entry");
  if (mayEntry) {
    assert(mayEntry.totalKg === 45, `May totalKg should be 45 (15+20+10), got ${mayEntry.totalKg}`);
    assert(mayEntry.profit === 2_670_000, `May profit should be 2670000, got ${mayEntry.profit}`);
    assert(mayEntry.avgHargaSentral > 0, "May avgHargaSentral should be > 0");
    assert(mayEntry.avgHargaJual > 0, "May avgHargaJual should be > 0");
  }

  // Test 3: Weekly aggregation
  const weekly = aggregateDashboardData(sampleProduction, sampleCashflow, sampleSales, "weekly");
  assert(weekly.length >= 1, "weekly should have at least 1 interval");

  // Test 4: Empty data returns empty array
  const empty = aggregateDashboardData([], [], [], "daily");
  assert(empty.length === 0, "empty production should return empty array");

  // Test 5: Data without sales should still produce entries with 0 prices
  const noSales = aggregateDashboardData(sampleProduction, sampleCashflow, [], "daily");
  assert(noSales.length === 3, "no-sales daily should have 3 intervals");
  assert(noSales[0].avgHargaSentral === 0, "no-sales avgHargaSentral should be 0");
  assert(noSales[0].avgHargaJual === 0, "no-sales avgHargaJual should be 0");

  // Test 6: Data without cashflow should still produce entries with 0 profit/expenses
  const noCashflow = aggregateDashboardData(sampleProduction, [], sampleSales, "daily");
  assert(noCashflow.length === 3, "no-cashflow daily should have 3 intervals");
  assert(noCashflow[0].profit === 0, "no-cashflow profit should be 0");
  assert(noCashflow[0].expenses === 0, "no-cashflow expenses should be 0");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("✅ All tests passed!");
}

main();
