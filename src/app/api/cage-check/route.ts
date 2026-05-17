import { NextResponse } from "next/server";
import { getTestSession, requireAdmin, getSession } from "@/lib/auth-helpers";
import { getCageCheckData, saveCageCheckData } from "@/lib/data";
import { z } from "zod";

const checkItemSchema = z.object({
  baris: z.number().int().min(1),
  kolom: z.number().int().min(1).max(8),
  subPos: z.number().int().default(0),
  status: z.enum(["PRODUCING", "NOT_PRODUCING", "EMPTY"]),
});

const cageCheckSchema = z.object({
  date: z.string().min(1),
  cageMasterId: z.string().min(1),
  checks: z.array(checkItemSchema),
  cageMasterJmlAyam: z.number().int().optional(),
});

export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const cageMasterId = searchParams.get("cageMasterId");

  if (!date || !cageMasterId) {
    return NextResponse.json({ error: "date and cageMasterId required" }, { status: 400 });
  }

  const data = await getCageCheckData(date, cageMasterId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = isTest ? true : await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = cageCheckSchema.parse(body);
    const result = await saveCageCheckData({
      date: new Date(validated.date),
      cageMasterId: validated.cageMasterId,
      checks: validated.checks,
      cageMasterJmlAyam: validated.cageMasterJmlAyam,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
