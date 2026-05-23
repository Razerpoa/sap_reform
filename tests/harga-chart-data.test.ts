/**
 * Test for Harga Sentral chart data preparation
 * Validates that aggregated data contains proper price fields for the line chart
 * Run with: npx tsx tests/harga-chart-data.test.ts
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
  console.log("Testing Harga Sentral chart data...\n");

  const day1 = "2026-05-01";
  const day2 = "2026-05-02";

  const sampleProduction: any[] = [
    { date: day1, cageData: { B1: { rows: [{ peti: true, tray: 0, butir: 0 }], extra: { extraKg: 0 } } } },
    { date: day2, cageData: { B1: { rows: [{ peti: true, tray: 0, butir: 0 }], extra: { extraKg: 0 } } } },
  ];

  const sampleCashflow: any[] = [
    { date: day1, totalPenjualan: 1_000_000, biayaPakan: 500_000, biayaOperasional: 100_000 },
    { date: day2, totalPenjualan: 2_000_000, biayaPakan: 600_000, biayaOperasional: 150_000 },
  ];

  const sampleSales: any[] = [
    { date: day1, hargaSentral: 25_000, hargaJual: 27_000 },
    { date: day2, hargaSentral: 26_000, hargaJual: 28_500 },
  ];

  // Test: aggregated data has avgHargaSentral and avgHargaJual for each interval
  const daily = aggregateDashboardData(sampleProduction, sampleCashflow, sampleSales, "daily");
  assert(daily.length === 2, "should have 2 daily intervals");

  // Test: first day has correct prices
  assert(daily[0].avgHargaSentral === 25_000, `day1 avgHargaSentral should be 25000, got ${daily[0].avgHargaSentral}`);
  assert(daily[0].avgHargaJual === 27_000, `day1 avgHargaJual should be 27000, got ${daily[0].avgHargaJual}`);

  // Test: second day has correct prices
  assert(daily[1].avgHargaSentral === 26_000, `day2 avgHargaSentral should be 26000, got ${daily[1].avgHargaSentral}`);
  assert(daily[1].avgHargaJual === 28_500, `day2 avgHargaJual should be 28500, got ${daily[1].avgHargaJual}`);

  // Test: data can be directly mapped for LineChart use (name + two data keys)
  const chartMapped = daily.map((entry) => ({
    name: String(entry.date),
    avgHargaSentral: Number(entry.avgHargaSentral) || 0,
    avgHargaJual: Number(entry.avgHargaJual) || 0,
  }));
  assert(chartMapped.length === 2, "chart-mapped data should have 2 entries");
  assert(typeof chartMapped[0].name === "string", "chart entry should have name string");
  assert(typeof chartMapped[0].avgHargaSentral === "number", "avgHargaSentral should be number");
  assert(typeof chartMapped[0].avgHargaJual === "number", "avgHargaJual should be number");
  assert(chartMapped[0].avgHargaSentral === 25_000, "chart first hargaSentral should be 25000");
  assert(chartMapped[1].avgHargaJual === 28_500, "chart second hargaJual should be 28500");

  // Test: no sales data leads to zero prices
  const noSales = aggregateDashboardData(sampleProduction, sampleCashflow, [], "daily");
  assert(noSales.length === 2, "no-sales should have 2 intervals");
  assert(noSales[0].avgHargaSentral === 0, "no-sales avgHargaSentral should be 0");
  assert(noSales[0].avgHargaJual === 0, "no-sales avgHargaJual should be 0");

  // Test: zero sales harga fields produce zero averages
  const zeroPriceSales: any[] = [
    { date: day1, hargaSentral: 0, hargaJual: 0 },
  ];
  const withZeroPrices = aggregateDashboardData(
    [{ date: day1, cageData: { B1: { rows: [], extra: {} } } }],
    [], zeroPriceSales, "daily"
  );
  assert(withZeroPrices.length >= 1, "zero-price sales should produce an interval");
  if (withZeroPrices.length > 0) {
    assert(withZeroPrices[0].avgHargaSentral === 0, "zero-price avgHargaSentral should be 0");
    assert(withZeroPrices[0].avgHargaJual === 0, "zero-price avgHargaJual should be 0");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("✅ All tests passed!");
}

main();
