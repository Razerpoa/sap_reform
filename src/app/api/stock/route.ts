import { NextResponse } from "next/server";
import { getTestSession, getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { subDays, format } from "date-fns";

const stockSchema = z.object({
  date: z.string(),
  kandang: z.string(),
  openingKg: z.number().default(0),
  productionKg: z.number().default(0),
  soldKg: z.number().default(0),
  closingKg: z.number().default(0),
});

// GET: Fetch CageStock for a date
export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    const stockData = await prisma.cageStock.findMany({
      where: { date: new Date(dateStr) },
      orderBy: { kandang: "asc" },
    });

    return NextResponse.json(stockData);
  } catch (error) {
    console.error("[STOCK GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create or update CageStock row
export async function POST(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { date, kandang, productionKg, soldKg } = stockSchema.parse(body);

    // Parse the date
    const dateObj = new Date(date);

    // Find existing row for this date + cage
    let existingRow = await prisma.cageStock.findUnique({
      where: {
        date_kandang: {
          date: dateObj,
          kandang,
        },
      },
    });

    let openingKg = 0;

    if (!existingRow) {
      // Lazy creation: look up yesterday's closingKg for this cage
      const yesterday = subDays(dateObj, 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");

      const yesterdayRow = await prisma.cageStock.findUnique({
        where: {
          date_kandang: {
            date: yesterday,
            kandang,
          },
        },
      });

      // Use yesterday's closingKg as today's openingKg
      openingKg = yesterdayRow?.closingKg || 0;
    } else {
      // Use existing openingKg from the row
      openingKg = existingRow.openingKg;
    }

    // Calculate new closingKg
    // closingKg = openingKg + productionKg - soldKg
    // Note: productionKg and soldKg are deltas (changes), not absolute values
    const newProductionKg = existingRow ? existingRow.productionKg + productionKg : productionKg;
    const newSoldKg = existingRow ? existingRow.soldKg + soldKg : soldKg;
    const closingKg = openingKg + newProductionKg - newSoldKg;

    // Upsert the row
    const savedRow = await prisma.cageStock.upsert({
      where: {
        date_kandang: {
          date: dateObj,
          kandang,
        },
      },
      update: {
        productionKg: newProductionKg,
        soldKg: newSoldKg,
        closingKg,
      },
      create: {
        date: dateObj,
        kandang,
        openingKg,
        productionKg: newProductionKg,
        soldKg: newSoldKg,
        closingKg,
      },
    });

    return NextResponse.json(savedRow);
  } catch (error) {
    console.error("[STOCK POST] Error:", error);
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}