import { NextResponse } from "next/server";
import { getTestSession, getSession } from "@/lib/auth-helpers";
import { getCageStockData } from "@/lib/data";

// GET: Fetch cumulative stock data for all cages
// Query params:
//   - until: Optional date string (YYYY-MM-DD) to get cumulative stock up to that date
export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const untilDate = searchParams.get("until") || undefined;

    const stockData = await getCageStockData(untilDate);
    return NextResponse.json(stockData);
  } catch (error) {
    console.error("[STOCK GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}