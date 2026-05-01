import { NextResponse } from "next/server";
import { getTestSession, requireAdmin, getSession, canEditPastEntries } from "@/lib/auth-helpers";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";
import { getCashFlowData, saveCashFlowData } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const cashFlowSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  totalPenjualan: z.number().default(0),
  biayaPakan: z.number().default(0),
  biayaOperasional: z.number().default(0),
  up: z.number().default(0),
  salaries: z.record(z.string(), z.number()).default({}),
  devidenA: z.number().default(0),
  devidenB: z.number().default(0),
  saldoKas: z.number().default(0),
  saldoPemasukan: z.number().default(0),
  saldoKewajiban: z.number().default(0),
  saldoRekening: z.number().default(0),
  saldoCash: z.number().default(0),
});

export async function GET(request: Request) {
  // Bypass auth in test environment
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  // Use centralized data fetching
  if (dateStr) {
    const entries = await getCashFlowData({ date: dateStr });
    return NextResponse.json(entries);
  }

  const entries = await getCashFlowData({ take: 50 });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  // Bypass auth in test environment
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const isAdmin = isTest ? true : await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  try {
    const body = await request.json();
    const validatedData = cashFlowSchema.parse(body);
    
    
    // Use date from body directly for isTodayWIB check
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    const checkDate = new Date(dateStr);
    
    // Bypass date check for admins
    const canEditPast = isTest || await canEditPastEntries();
    if (!canEditPast && !isTodayWIB(checkDate)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    // Save with the merged/new salaries
    const dataToSave = {
      ...validatedData,
      // salaries,
    };
    
    // Use centralized save function
    const entry = await saveCashFlowData(dataToSave);
    return NextResponse.json(entry);
  } catch (error) {
    console.log("[CASHFLOW] Error:", error);
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

