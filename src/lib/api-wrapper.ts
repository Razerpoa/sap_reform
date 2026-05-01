import { NextResponse } from "next/server";
import { getTestSession, getSession } from "@/lib/auth-helpers";

export type AuthenticatedHandler = (session: any) => Promise<NextResponse>;

/**
 * Higher-order function to wrap API handlers with session and role checks
 */
export async function withAuth(
  handler: AuthenticatedHandler,
  options: { requireAdmin?: boolean } = { requireAdmin: true }
) {
  const isTest = process.env.NODE_ENV === "test" || process.env.TESTING_MODE === "true";
  const session = isTest ? getTestSession() : await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (options.requireAdmin && session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    return await handler(session);
  } catch (error) {
    console.error("[API ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
