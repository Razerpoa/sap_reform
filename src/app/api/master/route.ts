import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cageMasterSchema = z.object({
  kandang: z.string().min(1),
  jmlAyam: z.number().int().default(0),
  jmlEmber: z.number().default(0),
  jmlPakan: z.number().default(0),
  gramEkor: z.number().default(0),
  beratPakan: z.number().default(0),
  volEmber: z.number().nullable().default(0),
  hargaPakan: z.number().nullable().default(0),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.cageMaster.findMany({
    orderBy: { kandang: "asc" },
  });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validatedData = cageMasterSchema.parse(body);
    
    const data = await prisma.cageMaster.upsert({
      where: { kandang: validatedData.kandang },
      update: validatedData,
      create: validatedData,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
