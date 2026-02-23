import { auth } from "@/../auth";
import { type Session } from "next-auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unauthorizedError, forbiddenError } from "@/lib/safeError";
import { NextResponse } from "next/server";

// Must match actual DB roleEnum values: "user" | "coach" | "admin"
type AdminRole = "admin" | "coach";

interface AdminAuthResult {
  session: Session;
  userProfile: typeof userProfiles.$inferSelect;
}

/**
 * Verify that the current user has admin or coach role (from userProfile.role, NOT membership).
 * Returns the session and userProfile on success, or a NextResponse error.
 */
export async function requireAdminAuth(
  allowedRoles: AdminRole[] = ["admin", "coach"],
): Promise<AdminAuthResult | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError();
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  if (
    !userProfile ||
    !allowedRoles.includes(userProfile.role as AdminRole)
  ) {
    return forbiddenError();
  }

  return { session, userProfile };
}

/**
 * Type guard to check if the result is an error response.
 */
export function isAuthError(
  result: AdminAuthResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
