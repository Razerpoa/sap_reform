import { NextResponse } from "next/server";
import { getTestSession, requireAdmin, getSession } from "@/lib/auth-helpers";
import { authOptions } from "@/lib/auth";
import { getMasterData, saveMasterData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cageMasterSchema = z.object({
  id: z.string().optional(),
  kandang: z.string().min(1),
  jmlAyam: z.number().int().default(0),
  jmlEmber: z.number().default(0),
  jmlPakan: z.number().default(0),
  gramEkor: z.number().default(0),
  beratPakan: z.number().default(0),
  volEmber: z.number().nullable().default(0),
  hargaPakan: z.number().nullable().default(0),
  mortality: z.number().int().default(0),
  faktorPakan: z.number().default(13),
});

export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kandang = searchParams.get("kandang");

  if (kandang) {
    const data = await prisma.cageMaster.findUnique({
      where: { kandang },
    });
    return NextResponse.json(data || {});
  }

  // Use centralized data fetching
  const data = await getMasterData();
  return NextResponse.json(data);
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
    console.log('[MASTER POST] Body:', JSON.stringify(body));
    const validatedData = cageMasterSchema.parse(body);
    console.log('[MASTER POST] Validated:', JSON.stringify(validatedData));

    // Check for duplicate if creating new entry (no id provided)
    if (!validatedData.id) {
      const existing = await prisma.cageMaster.findUnique({
        where: { kandang: validatedData.kandang },
      });
      if (existing) {
        return NextResponse.json({ error: `Kandang ${validatedData.kandang} already exists` }, { status: 400 });
      }
    }
    
    // Use centralized save function
    const data = await saveMasterData(validatedData);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[MASTER POST] Error:', error);
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const isAdmin = isTest ? true : await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const kandang = searchParams.get("kandang");

    if (!kandang) {
      return NextResponse.json({ error: "kandang required" }, { status: 400 });
    }

    await prisma.cageMaster.delete({
      where: { kandang },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MASTER DELETE] Error:', error);
    return NextResponse.json({ error: "Not found or already deleted" }, { status: 404 });
  }
}
