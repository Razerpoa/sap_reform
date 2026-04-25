import { NextResponse } from "next/server";
import { getTestSession, requireAdmin, getSession, canEditPastEntries } from "@/lib/auth-helpers";
import { getSalesData, saveSalesData } from "@/lib/data";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";

const salesSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  customerName: z.string().min(1),
  jmlPeti: z.number().default(0),
  totalKg: z.number().default(0),
  hargaSentral: z.number().default(0),
  up: z.number().default(0),
  hargaJual: z.number().default(0),
  subTotal: z.number().default(0),
  totalKgHariIni: z.number().optional().nullable(),
  totalPetiHariIni: z.number().optional().nullable(),
  penjualanHariIni: z.number().optional().nullable(),
  totalProduksi: z.number().optional().nullable(),
  stockAkhir: z.number().optional().nullable(),
});

export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  // Use centralized data fetching
  if (dateStr) {
    const entries = await getSalesData({ date: dateStr });
    return NextResponse.json(entries);
  }

  const entries = await getSalesData({ take: 100 });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const isAdmin = isTest ? true : await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  try {
    const body = await request.json();
    const validatedData = salesSchema.parse(body);
    
    // Bypass date check for admins
    const canEditPast = isTest || await canEditPastEntries();
    if (!canEditPast && !isTodayWIB(validatedData.date)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    // Use centralized save function
    const entry = await saveSalesData(validatedData);
    
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
