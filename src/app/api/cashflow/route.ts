import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { isTodayWIB } from "@/lib/date-utils";
import { getCashFlowData, saveCashFlowData } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const cashFlowSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  totalPenjualan: z.number().default(0),
  biayaPakan: z.number().default(0),
  biayaOperasional: z.number().default(0),
  // New dynamic salaries field (maps worker IDs to amounts)
  salaries: z.record(z.string(), z.number()).default({}),
  // Legacy fields - kept for backward compatibility
  // gajiBepuk: z.number().default(0),
  // gajiBarman: z.number().default(0),
  // gajiAgung: z.number().default(0),
  // gajiEki: z.number().default(0),
  // gajiAdi: z.number().default(0),
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
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
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
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validatedData = cashFlowSchema.parse(body);
    
    // Handle backward compatibility: if old salary fields are provided, merge them into salaries
    // Managing old data is no longer needed
    // const salaries = { ...validatedData.salaries };
    // if (validatedData.gajiBepuk > 0 || validatedData.gajiBarman > 0 || validatedData.gajiAgung > 0 || 
    //     validatedData.gajiEki > 0 || validatedData.gajiAdi > 0) {
      // const workers = await prisma.worker.findMany();
      // const workerMap = Object.fromEntries(workers.map((w: any) => [w.name, w.id]));
      
      // if (validatedData.gajiBepuk > 0) salaries[workerMap["Bepuk"]] = validatedData.gajiBepuk;
      // if (validatedData.gajiBarman > 0) salaries[workerMap["Barman"]] = validatedData.gajiBarman;
      // if (validatedData.gajiAgung > 0) salaries[workerMap["Agung"]] = validatedData.gajiAgung;
      // if (validatedData.gajiEki > 0) salaries[workerMap["Eki"]] = validatedData.gajiEki;
      // if (validatedData.gajiAdi > 0) salaries[workerMap["Adi"]] = validatedData.gajiAdi;
    // }
    
    // Use date from body directly for isTodayWIB check
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    const checkDate = new Date(dateStr);
    
    if (!isTodayWIB(checkDate)) {
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

