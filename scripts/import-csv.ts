import * as XLSX from "xlsx";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import { recalculateStock } from "../src/lib/stock";

const createPrismaClient = () => {
  const url = "postgresql://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@" + process.env.DATABASE_HOST + "/sap_reform?schema=public";
  const isProxy = url.startsWith("prisma://") || url.startsWith("prisma+postgres://");

  if (isProxy) {
    return new PrismaClient({
      // @ts-ignore
      accelerateUrl: url,
    });
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    // @ts-ignore
    adapter
  });
};

const prisma = createPrismaClient();

// Valid table names
const VALID_TABLES = ["CageMaster", "Worker", "OtherExpense", "Sales", "CashFlow", "Production"];

// Required columns per table
const REQUIRED_COLUMNS: Record<string, string[]> = {
  CageMaster: ["kandang"],
  Worker: ["name"],
  OtherExpense: ["date", "amount", "description"],
  Sales: ["date", "customerName"],
  CashFlow: ["date"],
  Production: ["Tanggal", "Kandang"],
};

// Parse date string to Date object
function parseDate(value: string | number | Date | undefined): Date | undefined {
  if (!value) return undefined;
  
  if (value instanceof Date) return value;
  
  const str = String(value).trim();
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str);
  }
  
  // Try DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  
  // Try MM/DD/YYYY
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    return new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]));
  }
  
  // Fallback to native Date parsing
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

// Parse JSON string or return default
function parseJson(value: any, defaultValue: any = {}): any {
  if (!value) return defaultValue;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return defaultValue;
  }
}

// Parse optional float — returns undefined if cell is empty/null/NaN
function optionalFloat(value: any): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = parseFloat(value);
  return isNaN(n) ? undefined : n;
}

// Parse optional int — returns undefined if cell is empty/null/NaN
function optionalInt(value: any): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = parseInt(value);
  return isNaN(n) ? undefined : n;
}

// Parse salaries string to JSON (format: "workerName:amount,workerName2:amount2")
function parseSalaries(value: any): Record<string, number> {
  if (!value) return {};
  
  const parsed = parseJson(value);
  if (Object.keys(parsed).length > 0) return parsed;
  
  // Try string format: "name1:amount1,name2:amount2"
  const str = String(value);
  const result: Record<string, number> = {};
  
  const pairs = str.split(",");
  for (const pair of pairs) {
    const [name, amount] = pair.split(":");
    if (name && amount) {
      result[name.trim()] = parseFloat(amount) || 0;
    }
  }
  
  return result;
}

// Parse Production cage data from per-row peti columns
function parseProductionCageData(row: Record<string, any>): string | null {
  const kandang = String(row.Kandang || "").trim();
  if (!kandang) return null;

  // Build exactly 3 rows
  const rows: { peti: boolean; tray: number; butir: number }[] = [];

  // Accumulators for partial petis
  let extraTray = 0;
  let extraButir = 0;
  let extraKg = 0;

  for (let i = 1; i <= 3; i++) {
    const kg = parseFloat(row[`Peti ${i} Kg`] || row[`Peti ${i} kg`] || 0) || 0;
    const tray = parseFloat(row[`Peti ${i} Tray`] || row[`Peti ${i} tray`] || 0) || 0;
    const butir = parseFloat(row[`Peti ${i} Butir`] || row[`Peti ${i} butir`] || 0) || 0;

    if (kg >= 15) {
      // Full peti - tray/butir stay, remainder kg goes to extra
      rows.push({ peti: true, tray, butir });
      extraKg += kg - 15;
    } else if (kg > 0) {
      // Partial peti - all to extra
      rows.push({ peti: false, tray: 0, butir: 0 });
      extraKg += kg;
      extraTray += tray;
      extraButir += butir;
    } else {
      // Empty peti
      rows.push({ peti: false, tray: 0, butir: 0 });
    }
  }

  // Add existing Sisa columns on top of accumulated partials
  const sisaTray = parseFloat(row["Sisa Tray"] || row["sisa tray"] || 0) || 0;
  const sisaButir = parseFloat(row["Sisa Butir"] || row["sisa butir"] || 0) || 0;
  const sisaKg = parseFloat(row["Sisa Kg"] || row["sisa kg"] || 0) || 0;

  return JSON.stringify({
    rows,
    extra: {
      extraTray: extraTray + sisaTray,
      extraButir: extraButir + sisaButir,
      extraKg: extraKg + sisaKg,
    },
  });
}

// Import functions for each table
async function importCageMaster(rows: Record<string, any>[]) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const kandang = row.kandang;
      if (!kandang) {
        console.log(`  ⚠ Skipping row: missing kandang`);
        errors++;
        continue;
      }

      const csvJmlAyam = optionalFloat(row.jmlAyam);
      const csvJmlEmber = optionalFloat(row.jmlEmber);
      const csvJmlPakan = optionalFloat(row.jmlPakan);
      const csvHargaPakan = optionalFloat(row.hargaPakan);
      const csvHargaSentral = optionalFloat(row.hargaSentral);
      const csvMortality = optionalInt(row.mortality);
      const csvFaktorPakan = optionalFloat(row.faktorPakan);

      const existing = await prisma.cageMaster.findUnique({ where: { kandang: String(kandang) } });

      if (existing) {
        // Merge: CSV values take precedence, missing cells keep existing DB values
        const mergedJmlAyam = csvJmlAyam ?? existing.jmlAyam;
        const mergedJmlEmber = csvJmlEmber ?? existing.jmlEmber;
        const mergedJmlPakan = csvJmlPakan ?? existing.jmlPakan;
        const mergedHargaPakan = csvHargaPakan ?? existing.hargaPakan ?? 0;
        const mergedHargaSentral = csvHargaSentral ?? existing.hargaSentral;
        const mergedMortality = csvMortality ?? existing.mortality;
        const mergedFaktorPakan = csvFaktorPakan ?? existing.faktorPakan;

        // Compute derived from merged values
        const gramEkor = mergedJmlAyam > 0 ? mergedJmlPakan / mergedJmlAyam : 0;
        const beratPakan = mergedJmlPakan * mergedHargaPakan;
        const volEmber = mergedJmlEmber > 0 ? mergedJmlPakan / mergedJmlEmber : 0;

        // Build update data: only include explicitly provided fields + always include derived
        const data: any = { gramEkor, beratPakan, volEmber };
        if (csvJmlAyam !== undefined) data.jmlAyam = csvJmlAyam;
        if (csvJmlEmber !== undefined) data.jmlEmber = csvJmlEmber;
        if (csvJmlPakan !== undefined) data.jmlPakan = csvJmlPakan;
        if (csvHargaPakan !== undefined) data.hargaPakan = csvHargaPakan;
        if (csvHargaSentral !== undefined) data.hargaSentral = csvHargaSentral;
        if (csvMortality !== undefined) data.mortality = csvMortality;
        if (csvFaktorPakan !== undefined) data.faktorPakan = csvFaktorPakan;

        await prisma.cageMaster.update({
          where: { kandang: String(kandang) },
          data,
        });
        updated++;
      } else {
        // Create: missing values default to 0 (or 13 for faktorPakan)
        const jmlAyam = csvJmlAyam ?? 0;
        const jmlEmber = csvJmlEmber ?? 0;
        const jmlPakan = csvJmlPakan ?? 0;
        const hargaPakan = csvHargaPakan ?? 0;
        const hargaSentral = csvHargaSentral ?? 0;
        const mortality = csvMortality ?? 0;
        const faktorPakan = csvFaktorPakan ?? 13;

        const gramEkor = jmlAyam > 0 ? jmlPakan / jmlAyam : 0;
        const beratPakan = jmlPakan * hargaPakan;
        const volEmber = jmlEmber > 0 ? jmlPakan / jmlEmber : 0;

        await prisma.cageMaster.create({
          data: {
            kandang: String(kandang),
            jmlAyam,
            jmlEmber,
            jmlPakan,
            hargaPakan,
            hargaSentral,
            mortality,
            faktorPakan,
            gramEkor,
            beratPakan,
            volEmber,
          },
        });
        inserted++;
      }
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function importWorker(rows: Record<string, any>[]) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const name = row.name;
      if (!name) {
        console.log(`  ⚠ Skipping row: missing name`);
        errors++;
        continue;
      }

      const active = row.active === true || row.active === "true" || row.active === "1" || row.active === 1;
      const canSell = row.canSell === true || row.canSell === "true" || row.canSell === "1" || row.canSell === 1;

      const existing = await prisma.worker.findUnique({ where: { name: String(name) } });

      if (existing) {
        await prisma.worker.update({
          where: { name: String(name) },
          data: { active, canSell },
        });
        updated++;
      } else {
        await prisma.worker.create({ data: { name: String(name), active, canSell } });
        inserted++;
      }
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function importOtherExpense(rows: Record<string, any>[]) {
  let inserted = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const date = parseDate(row.date);
      const amount = parseFloat(row.amount);
      const description = row.description;

      if (!date || isNaN(amount) || !description) {
        console.log(`  ⚠ Skipping row: missing required fields`);
        errors++;
        continue;
      }

      await prisma.otherExpense.create({
        data: {
          date,
          amount,
          description: String(description),
        },
      });
      inserted++;
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  return { inserted, updated: 0, errors };
}

async function importSales(rows: Record<string, any>[]) {
  let inserted = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const date = parseDate(row.date);
      const customerName = row.customerName;

      if (!date || !customerName) {
        console.log(`  ⚠ Skipping row: missing date or customerName`);
        errors++;
        continue;
      }

      const data: any = {
        date,
        customerName: String(customerName),
        pic: String(row.pic || ""),
        jmlPeti: optionalFloat(row.jmlPeti) ?? 0,
        totalKg: optionalFloat(row.totalKg) ?? 0,
        hargaSentral: optionalFloat(row.hargaSentral) ?? 0,
        up: optionalFloat(row.up) ?? 0,
        hargaJual: optionalFloat(row.hargaJual) ?? 0,
        subTotal: optionalFloat(row.subTotal) ?? 0,
        totalKgHariIni: optionalFloat(row.totalKgHariIni) ?? 0,
        totalPetiHariIni: optionalFloat(row.totalPetiHariIni) ?? 0,
        penjualanHariIni: optionalFloat(row.penjualanHariIni) ?? 0,
        totalProduksi: optionalFloat(row.totalProduksi) ?? 0,
        stockAkhir: optionalFloat(row.stockAkhir) ?? 0,
        sourceCages: parseJson(row.sourceCages, []),
      };

      await prisma.sales.create({ data });
      inserted++;
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  return { inserted, updated: 0, errors };
}

async function importCashFlow(rows: Record<string, any>[]) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // All numeric cashflow fields
  const numericFields = [
    "totalPenjualan", "biayaPakan", "biayaOperasional", "up",
    "devidenA", "devidenB", "saldoKas", "saldoPemasukan",
    "saldoKewajiban", "saldoRekening", "saldoCash",
  ] as const;

  for (const row of rows) {
    try {
      const date = parseDate(row.date);
      if (!date) {
        console.log(`  ⚠ Skipping row: missing date`);
        errors++;
        continue;
      }

      // Parse all optional numeric fields at once
      const csvValues: Record<string, number | undefined> = {};
      for (const field of numericFields) {
        csvValues[field] = optionalFloat(row[field]);
      }

      const existing = await prisma.cashFlow.findFirst({ where: { date } });

      const data: any = { date, salaries: parseSalaries(row.salaries) };

      if (existing) {
        // Update: only include explicitly provided numeric fields
        for (const field of numericFields) {
          if (csvValues[field] !== undefined) {
            data[field] = csvValues[field];
          }
        }
        await prisma.cashFlow.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        // Create: missing fields default to 0
        for (const field of numericFields) {
          data[field] = csvValues[field] ?? 0;
        }
        await prisma.cashFlow.create({ data });
        inserted++;
      }
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function importProduction(rows: Record<string, any>[]) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Validate all cages in CSV exist in CageMaster
  const cages = await prisma.cageMaster.findMany({ orderBy: { kandang: "asc" } });
  const validKandang = new Set(cages.map(c => c.kandang));

  for (const row of rows) {
    try {
      const date = parseDate(row.Tanggal || row.date);
      if (!date) {
        console.log(`  ⚠ Skipping row: missing date (Tanggal)`);
        errors++;
        continue;
      }

      const parsed = parseProductionCageData(row);
      if (!parsed) {
        console.log(`  ⚠ Skipping row: missing Kandang`);
        errors++;
        continue;
      }

      const cageData = JSON.parse(parsed);
      const kandang = row.Kandang?.trim();

      if (!validKandang.has(kandang)) {
        console.log(`  ⚠ Skipping row: Kandang "${kandang}" not found in CageMaster`);
        errors++;
        continue;
      }

      // Find or create production record by date
      let existing = await prisma.production.findUnique({ where: { date } });
      
      let newCageData: Record<string, any> = {};
      let newCageSummary: Record<string, any> = {};

      if (existing && existing.cageData && typeof existing.cageData === 'object') {
        // Merge: preserve other cages, only update this one
        newCageData = { ...existing.cageData };
      }
      newCageData[kandang] = cageData;

      // Calculate cageSummary for this cage
      const rows = cageData.rows || [];
      const extra = cageData.extra || {};
      const totalKg = rows.filter((r: any) => r.peti).length * 15 + (extra.extraKg || 0);
      const totalTray = rows.reduce((sum: number, r: any) => sum + (r.tray || 0), 0) + (extra.extraTray || 0);
      const totalButir = rows.reduce((sum: number, r: any) => sum + (r.butir || 0), 0) + (extra.extraButir || 0);
      const existingSummary = (existing?.cageSummary && typeof existing.cageSummary === 'object') ? existing.cageSummary : {};
      newCageSummary = { ...existingSummary, [kandang]: { totalKg, totalTray, totalButir } };

      const data: any = {
        date,
        cageData: newCageData,
        cageSummary: newCageSummary,
      };

      if (existing) {
        await prisma.production.update({ where: { date }, data });
        updated++;
      } else {
        await prisma.production.create({ data });
        inserted++;
      }
    } catch (e: any) {
      console.log(`  ⚠ Error: ${e.message}`);
      errors++;
    }
  }

  // Auto-calculate productionKg and soldKg for all dates
  await recalculateStock();

  return { inserted, updated, skipped, errors };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Check for --wipe-all flag
  const wipeAllIndex = args.indexOf("--wipe-all");
  const wipeAll = wipeAllIndex !== -1;
  
  // Remove --wipe-all from args for processing
  const cleanArgs = wipeAll ? args.filter((_, i) => i !== wipeAllIndex) : args;
  
  if (cleanArgs.length < 2) {
    console.error("Usage: npm run import <table> <csv-file> [--wipe-all]");
    console.error("");
    console.error("Valid tables:");
    for (const table of VALID_TABLES) {
      console.error(`  - ${table}`);
    }
    console.error("");
    console.error("Options:");
    console.error("  --wipe-all  Clear existing data in the table before import");
    process.exit(1);
  }

  const tableName = cleanArgs[0];
  const filePath = cleanArgs[1];

  // Validate table name
  if (!VALID_TABLES.includes(tableName)) {
    console.error(`Invalid table: ${tableName}`);
    console.error(`Valid tables: ${VALID_TABLES.join(", ")}`);
    process.exit(1);
  }

  // Read CSV file
  let workbook: XLSX.WorkBook;
  try {
    // Use XLSX.read with explicit options for better CSV handling
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    workbook = XLSX.read(fileContent, { type: 'string', raw: true });
  } catch (e: any) {
    console.error(`Failed to read file: ${e.message}`);
    process.exit(1);
  }

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header: 1 to treat first row as headers
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];

  if (rows.length === 0) {
    console.error("No data found in CSV file");
    process.exit(1);
  }

  // Validate required columns
  const required = REQUIRED_COLUMNS[tableName];
  const firstRow = rows[0];
  const columns = Object.keys(firstRow);
  
  const missing = required.filter(col => !columns.some(c => c.toLowerCase() === col.toLowerCase()));
  if (missing.length > 0) {
    console.error(`Missing required columns: ${missing.join(", ")}`);
    console.error(`Found columns: ${columns.join(", ")}`);
    process.exit(1);
  }

  console.log(`Importing ${tableName} from ${filePath}...`);
  console.log(`Found ${rows.length} rows`);

  // Clear table if --wipe-all flag is used
  if (wipeAll) {
    console.log(`⚠ Clearing existing ${tableName} data...`);
    switch (tableName) {
      case "CageMaster":
        await prisma.cageMaster.deleteMany();
        break;
      case "Worker":
        await prisma.worker.deleteMany();
        break;
      case "OtherExpense":
        await prisma.otherExpense.deleteMany();
        break;
      case "Sales":
        await prisma.sales.deleteMany();
        break;
      case "CashFlow":
        await prisma.cashFlow.deleteMany();
        break;
      case "Production":
        await prisma.production.deleteMany();
        break;
    }
    console.log(`✓ Cleared ${tableName}`);
  }

  // Import based on table
  let result: { inserted: number; updated: number; errors: number };
  
  switch (tableName) {
    case "CageMaster":
      result = await importCageMaster(rows);
      break;
    case "Worker":
      result = await importWorker(rows);
      break;
    case "OtherExpense":
      result = await importOtherExpense(rows);
      break;
    case "Sales":
      result = await importSales(rows);
      break;
    case "CashFlow":
      result = await importCashFlow(rows);
      break;
    case "Production":
      result = await importProduction(rows);
      break;
    default:
      console.error(`Unknown table: ${tableName}`);
      process.exit(1);
  }

  console.log(`\n✓ Inserted: ${result.inserted} | Updated: ${result.updated} | Errors: ${result.errors}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // @ts-ignore
    await prisma.$disconnect();
  });