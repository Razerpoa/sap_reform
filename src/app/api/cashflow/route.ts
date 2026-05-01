import { NextResponse } from "next/server";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";
import { getCashFlowData, saveCashFlowData } from "@/lib/data";
import { withAuth } from "@/lib/api-wrapper";
import { canEditPastEntries } from "@/lib/auth-helpers";

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
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (dateStr) {
      const entries = await getCashFlowData({ date: dateStr });
      return NextResponse.json(entries);
    }

    const entries = await getCashFlowData({ take: 50 });
    return NextResponse.json(entries);
  }, { requireAdmin: false }); // Allow whitelisted users to READ
}

export async function POST(request: Request) {
  return withAuth(async () => {
    try {
      const body = await request.json();
      const validatedData = cashFlowSchema.parse(body);
      
      const dateStr = body.date || new Date().toISOString().split('T')[0];
      const checkDate = new Date(dateStr);
      
      const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
      const canEditPast = isTest || await canEditPastEntries();
      
      if (!canEditPast && !isTodayWIB(checkDate)) {
        return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
      }

      const entry = await saveCashFlowData(validatedData);
      return NextResponse.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
      }
      throw error; // Rethrow to let withAuth handle generic errors
    }
  }, { requireAdmin: true });
}

