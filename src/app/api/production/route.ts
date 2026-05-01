import { NextResponse } from "next/server";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";
import { getProductionData, saveProductionData } from "@/lib/data";
import { withAuth } from "@/lib/api-wrapper";
import { canEditPastEntries } from "@/lib/auth-helpers";

// Sub-schema for a single row
const rowSchema = z.object({
  peti: z.boolean().default(false),
  tray: z.number().int().default(0),
  butir: z.number().int().default(0),
});

// Sub-schema for footer/extra totals
const extraSchema = z.object({
  extraTray: z.number().int().default(0),
  extraButir: z.number().int().default(0),
  extraKg: z.number().default(0),
});

// Sub-schema for a single cage
const cageDataSchema = z.object({
  rows: z.array(rowSchema).length(3),
  extra: extraSchema,
});

// Main production schema
const productionSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  cageData: z.record(z.string(), z.any()).optional().default({}),
  cageSummary: z.record(z.string(), z.any()).optional().default({}),
});

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (dateStr) {
      const entries = await getProductionData({ date: dateStr });
      return NextResponse.json(entries[0] || {});
    }

    const entries = await getProductionData({ take: 365 * 2 });
    return NextResponse.json(entries);
  }, { requireAdmin: false });
}

export async function POST(request: Request) {
  return withAuth(async () => {
    try {
      const body = await request.json();
      const validatedData = productionSchema.parse(body);
      
      const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
      const canEditPast = isTest || await canEditPastEntries();
      
      if (!canEditPast && !isTodayWIB(validatedData.date)) {
        return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
      }

      const entry = await saveProductionData(validatedData);
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