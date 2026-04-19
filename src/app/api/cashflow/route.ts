import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { isTodayWIB } from "@/lib/date-utils";

const cashFlowSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => startOfDay(new Date(str))),
  totalPenjualan: z.number().default(0),
  biayaPakan: z.number().default(0),
  biayaOperasional: z.number().default(0),
  gajiBepuk: z.number().default(0),
  gajiBarman: z.number().default(0),
  gajiAgung: z.number().default(0),
  gajiEki: z.number().default(0),
  gajiAdi: z.number().default(0),
  devidenA: z.number().default(0),
  devidenB: z.number().default(0),
  saldoKas: z.number().default(0),
  saldoPemasukan: z.number().default(0),
  saldoKewajiban: z.number().default(0),
  saldoRekening: z.number().default(0),
  saldoCash: z.number().default(0),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (dateStr) {
    const date = startOfDay(new Date(dateStr));
    const entries = await prisma.cashFlow.findMany({ where: { date } });
    return NextResponse.json(entries);
  }

  const entries = await prisma.cashFlow.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validatedData = cashFlowSchema.parse(body);
    
    if (!isTodayWIB(validatedData.date)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    const { id, ...data } = validatedData;
    const entry = id 
      ? await prisma.cashFlow.update({ where: { id }, data })
      : await prisma.cashFlow.create({ data });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
