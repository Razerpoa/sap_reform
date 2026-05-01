import { withAuth } from "@/lib/api-wrapper";
import { runIntegrityCheck } from "@/lib/integrity";
import { NextResponse } from "next/server";

export async function GET() {
  return withAuth(async () => {
    try {
      const result = await runIntegrityCheck();
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("[Integrity API] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }, { requireAdmin: true }); // Only admins should see system health
}
