import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

// Re-export authOptions for API routes
export { authOptions } from "./auth";

/**
 * Check if session has ADMIN role
 * Fetches role fresh from database on each call to catch role changes
 */
export async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  // No session = not logged in
  if (!session?.user?.email) return false;

  // Fetch role fresh from database (catches role updates without re-login)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  // ADMIN can do CRUD, WHITELISTED can only read
  return dbUser?.role === "ADMIN";
}

/**
 * Get current session
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Check if user is whitelisted only (read-only access)
 */
export function isWhitelistedOnly(role?: UserRole): boolean {
  return role === "WHITELISTED";
}

/**
 * Check if admin - bypasses date restrictions on past entries
 * Returns true for admins, allowing them to edit past data
 */
export async function canEditPastEntries(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  
  return dbUser?.role === "ADMIN";
}

/**
 * Helper to bypass auth in test environment
 */
export function getTestSession() {
  return { user: { email: "test@test.com", role: "ADMIN" } };
}