import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
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

// Helper to bypass auth in test environment
function getTestSession() {
  return { user: { email: "test@test.com" } };
}

export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getServerSession(authOptions);
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
  const session = isTest ? getTestSession() : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    console.log('[MASTER POST] Body:', JSON.stringify(body));
    const validatedData = cageMasterSchema.parse(body);
    console.log('[MASTER POST] Validated:', JSON.stringify(validatedData));
    
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
  const session = isTest ? getTestSession() : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
