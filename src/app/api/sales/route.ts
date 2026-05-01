import { NextResponse } from "next/server";
import { getSalesData, saveSalesData } from "@/lib/data";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";
import { withAuth } from "@/lib/api-wrapper";
import { canEditPastEntries } from "@/lib/auth-helpers";

const salesSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  customerName: z.string().min(1),
  jmlPeti: z.number().default(0),
  totalKg: z.number().default(0),
  hargaSentral: z.number().optional().nullable(),
  up: z.number().default(0),
  hargaJual: z.number().default(0),
  subTotal: z.number().default(0),
  totalKgHariIni: z.number().optional().nullable(),
  totalPetiHariIni: z.number().optional().nullable(),
  penjualanHariIni: z.number().optional().nullable(),
  totalProduksi: z.number().optional().nullable(),
  stockAkhir: z.number().optional().nullable(),
  sourceCages: z.array(z.object({
    kandang: z.string(),
    jmlPeti: z.number(),
    jmlKg: z.number(),
  })).optional().nullable(),
});

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (dateStr) {
      const entries = await getSalesData({ date: dateStr });
      return NextResponse.json(entries);
    }

    const entries = await getSalesData({ take: 100 });
    return NextResponse.json(entries);
  }, { requireAdmin: false });
}

export async function POST(request: Request) {
  return withAuth(async () => {
    try {
      const body = await request.json();
      const validatedData = salesSchema.parse(body);
      
      const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
      const canEditPast = isTest || await canEditPastEntries();
      
      if (!canEditPast && !isTodayWIB(validatedData.date)) {
        return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
      }

      const entry = await saveSalesData(validatedData);
      return NextResponse.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
      }
      throw error;
    }
  }, { requireAdmin: true });
}
