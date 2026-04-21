import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// Helper function to build dynamic salary headers and values
async function buildSalaryColumnsForCashFlow(cashflowEntries: any[]) {
  // Get all workers sorted by name
  const workers = await prisma.worker.findMany({
    orderBy: { name: "asc" },
  });

  const salaryHeaders = workers.map((w: any) => `Gaji ${w.name}`);
  
  const salaryRows = cashflowEntries.map((entry: any) => {
    const salaries = entry.salaries || {};
    return workers.map((w: any) => salaries[w.id] || 0);
  });

  return { salaryHeaders, salaryRows, workers };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const formatType = searchParams.get("format") || "xlsx";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Build date where clause
  const whereClause: any = {};
  if (startDate || endDate) {
    whereClause.date = dateFilter;
  }

  // Fetch all data in parallel
  const [production, sales, cashflow, users] = await Promise.all([
    prisma.production.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    }),
    prisma.sales.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    }),
    prisma.cashFlow.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
    }),
  ]);

  // Check if there's any data
  if (production.length === 0 && sales.length === 0 && cashflow.length === 0 && users.length === 0) {
    return NextResponse.json({ error: "No entries to export" }, { status: 404 });
  }

  const dateStr = format(new Date(), "yyyy-MM-dd");

  if (formatType === "csv") {
    // Create ZIP with 4 CSV files
    const zip = new JSZip();

    // Production sheet
    if (production.length > 0) {
      const prodHeaders = [
        "Date", "B1 KG", "B1 Butir", "B1+ KG", "B1+ Butir",
        "B2 KG", "B2 Butir", "B2+ KG", "B2+ Butir",
        "B3 KG", "B3 Butir", "B3+ KG", "B3+ Butir", "Total KG",
        "Total Butir", "B1 HPP", "B1+ HPP", "B2 HPP", "B2+ HPP", "B3 HPP", "B3+ HPP",
        "Harga Sentral", "UP", "Harga Kandang", "Profit Daily"
      ];
      const prodRows = production.map((entry: any) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.b1Kg, entry.b1JmlTelur, entry.b1pKg, entry.b1pJmlTelur,
        entry.b2Kg, entry.b2JmlTelur, entry.b2pKg, entry.b2pJmlTelur,
        entry.b3Kg, entry.b3JmlTelur, entry.b3pKg, entry.b3pJmlTelur,
        entry.totalKg, entry.totalJmlTelur,
        entry.b1Hpp, entry.b1pHpp, entry.b2Hpp, entry.b2pHpp, entry.b3Hpp, entry.b3pHpp,
        entry.hargaSentral, entry.up, entry.hargaKandang, entry.profitDaily
      ]);
      const prodCsv = [prodHeaders.join(","), ...prodRows.map((row: any[]) => row.join(","))].join("\n");
      zip.file("Production.csv", prodCsv);
    }

    // Sales sheet
    if (sales.length > 0) {
      const salesHeaders = [
        "Date", "Customer Name", "Jml Peti", "Total KG", "Harga Central",
        "UP", "Harga Jual", "Sub Total", "Total KG Hari Ini", "Total Peti Hari Ini"
      ];
      const salesRows = sales.map((entry: any) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.customerName, entry.jmlPeti, entry.totalKg, entry.hargaCentral,
        entry.up, entry.hargaJual, entry.subTotal, entry.totalKgHariIni, entry.totalPetiHariIni
      ]);
      const salesCsv = [salesHeaders.join(","), ...salesRows.map((row: any[]) => row.join(","))].join("\n");
      zip.file("Sales.csv", salesCsv);
    }

    // CashFlow sheet
    if (cashflow.length > 0) {
      const { salaryHeaders, salaryRows } = await buildSalaryColumnsForCashFlow(cashflow);
      
      const cfHeaders = [
        "Date", "Total Penjualan", "Biaya Pakan", "Biaya Operasional",
        ...salaryHeaders,
        "Dividen A", "Dividen B", "Saldo Kas", "Saldo Pemasukan",
        "Saldo Kewajiban", "Saldo Rekening", "Saldo Cash"
      ];
      
      const cfRows = cashflow.map((entry: any, idx: number) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.totalPenjualan, entry.biayaPakan, entry.biayaOperasional,
        ...salaryRows[idx],
        entry.devidenA, entry.devidenB, entry.saldoKas, entry.saldoPemasukan,
        entry.saldoKewajiban, entry.saldoRekening, entry.saldoCash
      ]);
      
      const cfCsv = [cfHeaders.join(","), ...cfRows.map((row: any[]) => row.join(","))].join("\n");
      zip.file("CashFlow.csv", cfCsv);
    }

    // User sheet
    if (users.length > 0) {
      const userHeaders = ["Email", "Name"];
      const userRows = users.map((entry: any) => [entry.email, entry.name || ""]);
      const userCsv = [userHeaders.join(","), ...userRows.map((row: any[]) => row.join(","))].join("\n");
      zip.file("User.csv", userCsv);
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new Response(Buffer.from(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="sap-reform-export-${dateStr}.zip"`,
      },
    });
  }

  // Default: XLSX with 4 sheets
  const workbook = XLSX.utils.book_new();

  // Production sheet
  if (production.length > 0) {
    const prodData = [
      [
        "Date", "B1 KG", "B1 Butir", "B1+ KG", "B1+ Butir",
        "B2 KG", "B2 Butir", "B2+ KG", "B2+ Butir",
        "B3 KG", "B3 Butir", "B3+ KG", "B3+ Butir", "Total KG",
        "Total Butir", "B1 HPP", "B1+ HPP", "B2 HPP", "B2+ HPP", "B3 HPP", "B3+ HPP",
        "Harga Sentral", "UP", "Harga Kandang", "Profit Daily"
      ],
      ...production.map((entry: any) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.b1Kg, entry.b1JmlTelur, entry.b1pKg, entry.b1pJmlTelur,
        entry.b2Kg, entry.b2JmlTelur, entry.b2pKg, entry.b2pJmlTelur,
        entry.b3Kg, entry.b3JmlTelur, entry.b3pKg, entry.b3pJmlTelur,
        entry.totalKg, entry.totalJmlTelur,
        entry.b1Hpp, entry.b1pHpp, entry.b2Hpp, entry.b2pHpp, entry.b3Hpp, entry.b3pHpp,
        entry.hargaSentral, entry.up, entry.hargaKandang, entry.profitDaily
      ])
    ];
    const prodSheet = XLSX.utils.aoa_to_sheet(prodData);
    XLSX.utils.book_append_sheet(workbook, prodSheet, "Production");
  }

  // Sales sheet
  if (sales.length > 0) {
    const salesData = [
      [
        "Date", "Customer Name", "Jml Peti", "Total KG", "Harga Central",
        "UP", "Harga Jual", "Sub Total", "Total KG Hari Ini", "Total Peti Hari Ini"
      ],
      ...sales.map((entry: any) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.customerName, entry.jmlPeti, entry.totalKg, entry.hargaCentral,
        entry.up, entry.hargaJual, entry.subTotal, entry.totalKgHariIni, entry.totalPetiHariIni
      ])
    ];
    const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales");
  }

  // CashFlow sheet
  if (cashflow.length > 0) {
    const { salaryHeaders, salaryRows } = await buildSalaryColumnsForCashFlow(cashflow);
    
    const cfData = [
      [
        "Date", "Total Penjualan", "Biaya Pakan", "Biaya Operasional",
        ...salaryHeaders,
        "Dividen A", "Dividen B", "Saldo Kas", "Saldo Pemasukan",
        "Saldo Kewajiban", "Saldo Rekening", "Saldo Cash"
      ],
      ...cashflow.map((entry: any, idx: number) => [
        format(entry.date, "yyyy-MM-dd"),
        entry.totalPenjualan, entry.biayaPakan, entry.biayaOperasional,
        ...salaryRows[idx],
        entry.devidenA, entry.devidenB, entry.saldoKas, entry.saldoPemasukan,
        entry.saldoKewajiban, entry.saldoRekening, entry.saldoCash
      ])
    ];
    const cfSheet = XLSX.utils.aoa_to_sheet(cfData);
    XLSX.utils.book_append_sheet(workbook, cfSheet, "CashFlow");
  }

  // User sheet
  if (users.length > 0) {
    const userData = [
      ["Email", "Name"],
      ...users.map((entry: any) => [entry.email, entry.name || ""])
    ];
    const userSheet = XLSX.utils.aoa_to_sheet(userData);
    XLSX.utils.book_append_sheet(workbook, userSheet, "User");
  }

  const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  return new Response(Buffer.from(xlsxBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sap-reform-export-${dateStr}.xlsx"`,
    },
  });
}