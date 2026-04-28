import { NextResponse } from "next/server";
import { getTestSession, getSession } from "@/lib/auth-helpers";
import { getCageStockData } from "@/lib/data";

// GET: Fetch cumulative stock data for all cages
export async function GET(request: Request) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stockData = await getCageStockData();
    return NextResponse.json(stockData);
  } catch (error) {
    console.error("[STOCK GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}