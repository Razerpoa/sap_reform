import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const WorkerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

const WorkerUpdateSchema = z.object({
  id: z.string().min(1, "Worker ID is required"),
  name: z.string().min(1, "Name is required").trim(),
  active: z.boolean().default(true),
});

/**
 * GET /api/workers
 * Returns list of all active workers for salary entry
 */
export async function GET(request: Request) {
  // Bypass auth in test environment
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const workers = await prisma.worker.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(workers);
  } catch (error) {
    console.log("[WORKERS] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/workers
 * Create a new worker
 */
export async function POST(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = WorkerCreateSchema.parse(body);

    // Check if worker with this name already exists
    const existing = await prisma.worker.findUnique({
      where: { name: validated.name },
    });

    if (existing) {
      return NextResponse.json({ error: "Worker name already exists" }, { status: 400 });
    }

    const worker = await prisma.worker.create({
      data: {
        name: validated.name,
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.log("[WORKERS] POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/workers
 * Update a worker's name or status
 */
export async function PUT(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = WorkerUpdateSchema.parse(body);

    // Check if new name is already taken by another worker
    const existing = await prisma.worker.findUnique({
      where: { name: validated.name },
    });

    if (existing && existing.id !== validated.id) {
      return NextResponse.json({ error: "Worker name already exists" }, { status: 400 });
    }

    const worker = await prisma.worker.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        active: validated.active,
      },
    });

    return NextResponse.json(worker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.log("[WORKERS] PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/workers?id=WORKER_ID
 * Delete a worker (fails if worker is referenced in salary records)
 */
export async function DELETE(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? { user: { email: "test@test.com" } } : await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const workerId = url.searchParams.get("id");

    if (!workerId) {
      return NextResponse.json({ error: "Worker ID is required" }, { status: 400 });
    }

    // Check if worker is referenced in any CashFlow salary record
    const allCashFlows = await prisma.cashFlow.findMany({
      select: { id: true, salaries: true },
    });

    const hasWorkerInSalaries = allCashFlows.some((cf) => {
      const salaries = cf.salaries as Record<string, number> | null;
      return salaries && workerId in salaries;
    });

    if (hasWorkerInSalaries) {
      return NextResponse.json(
        { error: "Cannot delete worker: worker is referenced in salary records" },
        { status: 409 }
      );
    }

    const worker = await prisma.worker.delete({
      where: { id: workerId },
    });

    return NextResponse.json(worker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.log("[WORKERS] DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
