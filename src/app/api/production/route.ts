import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { isTodayWIB } from "@/lib/date-utils";
import { getProductionData, saveProductionData } from "@/lib/data";

const productionSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  b1JmlTelur: z.number().int().default(0),
  b1Kg: z.number().default(0),
  b1Pct: z.number().default(0),
  b1Fc: z.number().default(0),
  b1Hpp: z.number().default(0),
  
  b1pJmlTelur: z.number().int().default(0),
  b1pKg: z.number().default(0),
  b1pPct: z.number().default(0),
  b1pFc: z.number().default(0),
  b1pHpp: z.number().default(0),

  b2JmlTelur: z.number().int().default(0),
  b2Kg: z.number().default(0),
  b2Pct: z.number().default(0),
  b2Fc: z.number().default(0),
  b2Hpp: z.number().default(0),

  b2pJmlTelur: z.number().int().default(0),
  b2pKg: z.number().default(0),
  b2pPct: z.number().default(0),
  b2pFc: z.number().default(0),
  b2pHpp: z.number().default(0),

  b3JmlTelur: z.number().int().default(0),
  b3Kg: z.number().default(0),
  b3Pct: z.number().default(0),
  b3Fc: z.number().default(0),
  b3Hpp: z.number().default(0),

  b3pJmlTelur: z.number().int().default(0),
  b3pKg: z.number().default(0),
  b3pPct: z.number().default(0),
  b3pFc: z.number().default(0),
  b3pHpp: z.number().default(0),

  totalJmlTelur: z.number().int().default(0),
  totalKg: z.number().default(0),
  totalPct: z.number().default(0),
  totalFc: z.number().default(0),
  totalHpp: z.number().default(0),
  
  hargaSentral: z.number().default(0),
  up: z.number().default(0),
  hargaKandang: z.number().default(0),
  profitDaily: z.number().default(0),
  operasional: z.number().default(0),
  profitMonthly: z.number().default(0),
});

// Helper to bypass auth in test environment
function getTestSession() {
  return { user: { email: "test@test.com" } };
}

export async function GET(request: Request) {
  // Bypass auth in test environment
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  // Use centralized data fetching
  if (dateStr) {
    const entries = await getProductionData({ date: dateStr });
    return NextResponse.json(entries[0] || {});
  }

  const entries = await getProductionData({ take: 365 * 2 }); // 2 years for graphs
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  // Bypass auth in test environment
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validatedData = productionSchema.parse(body);
    
    // "Today Only" Mutation Rule
    if (!isTodayWIB(validatedData.date)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    // Use centralized save function
    const entry = await saveProductionData(validatedData);
    
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
