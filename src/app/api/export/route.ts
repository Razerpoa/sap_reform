import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.production.findMany({
    orderBy: { date: "asc" },
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "No entries to export" }, { status: 404 });
  }

  const headers = [
    "Date", "B1 KG", "B1 Butir", "B1+ KG", "B1+ Butir",
    "B2 KG", "B2 Butir", "B2+ KG", "B2+ Butir",
    "B3 KG", "B3 Butir", "B3+ KG", "B3+ Butir", "Total KG"
  ];

  const rows = entries.map((entry: any) => [
    format(entry.date, "yyyy-MM-dd"),
    entry.b1Kg, entry.b1JmlTelur, entry.b1pKg, entry.b1pJmlTelur,
    entry.b2Kg, entry.b2JmlTelur, entry.b2pKg, entry.b2pJmlTelur,
    entry.b3Kg, entry.b3JmlTelur, entry.b3pKg, entry.b3pJmlTelur,
    entry.totalKg
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row: any[]) => row.join(","))
  ].join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="sap-reform-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
