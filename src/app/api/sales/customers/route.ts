import { NextResponse } from "next/server";
import { getCustomerNames } from "@/lib/data";
import { withAuth } from "@/lib/api-wrapper";

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;

    const names = await getCustomerNames(q);
    return NextResponse.json({ names });
  }, { requireAdmin: false });
}
