import { NextResponse } from "next/server";
import { getTestSession, requireAdmin, getSession, canEditPastEntries } from "@/lib/auth-helpers";
import { getOtherExpensesData, saveOtherExpenseData, deleteOtherExpenseData } from "@/lib/data";
import { z } from "zod";
import { isTodayWIB } from "@/lib/date-utils";

const expenseSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  amount: z.number().min(0),
  description: z.string().min(1),
});

export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (dateStr) {
    const entries = await getOtherExpensesData({ date: dateStr });
    return NextResponse.json(entries);
  }

  const entries = await getOtherExpensesData({ take: 100 });
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
    const validatedData = expenseSchema.parse(body);
    
    // Bypass date check for admins
    const canEditPast = isTest || await canEditPastEntries();
    if (!canEditPast && !isTodayWIB(validatedData.date)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    const entry = await saveOtherExpenseData(validatedData);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const isAdmin = isTest ? true : await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  try {
    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    // Check existing entry to verify date
    const existing = await getOtherExpensesData({ date: validatedData.date.toISOString().split("T")[0] });
    const existingEntry = existing.find((e: any) => e.id === validatedData.id);
    
    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    // Bypass date check for admins
    const canEditPast = isTest || await canEditPastEntries();
    if (!canEditPast && !isTodayWIB(existingEntry.date)) {
      return NextResponse.json({ error: "Modification of past entries is forbidden." }, { status: 403 });
    }

    const entry = await saveOtherExpenseData(validatedData);
    return NextResponse.json(entry);
  } catch (error) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Check existing entry to verify date
    const existing = await getOtherExpensesData();
    const existingEntry = existing.find((e: any) => e.id === id);

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    // Bypass date check for admins
    const canEditPast = isTest || await canEditPastEntries();
    if (!canEditPast && !isTodayWIB(existingEntry.date)) {
      return NextResponse.json({ error: "Deletion of past entries is forbidden." }, { status: 403 });
    }

    await deleteOtherExpenseData(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}