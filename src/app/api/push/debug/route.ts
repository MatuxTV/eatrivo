import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from "@/index";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/push/debug?userId=<uuid>
 * Returns push subscription info for a specific user (admin only).
 *
 * GET /api/push/debug  (no userId)
 * Returns aggregate stats: total subscriptions, unique users.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId) {
    const subs = await db
      .select({
        id: pushSubscriptions.id,
        userAgent: pushSubscriptions.userAgent,
        createdAt: pushSubscriptions.createdAt,
        updatedAt: pushSubscriptions.updatedAt,
        subscription: pushSubscriptions.subscription,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return NextResponse.json({
      userId,
      subscriptionCount: subs.length,
      subscriptions: subs.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        endpoint: (s.subscription as { endpoint?: string })?.endpoint ?? null,
        hasKeys: !!(s.subscription as { keys?: unknown })?.keys,
      })),
    });
  }

  // Aggregate stats
  const all = await db
    .select({
      id: pushSubscriptions.id,
      userId: pushSubscriptions.userId,
    })
    .from(pushSubscriptions);

  const uniqueUsers = new Set(all.map((s) => s.userId)).size;

  return NextResponse.json({
    totalSubscriptions: all.length,
    uniqueUsers,
    vapidPublicKeyConfigured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKeyConfigured: !!process.env.VAPID_PRIVATE_KEY,
    adminEmailConfigured: !!process.env.ADMIN_EMAIL,
  });
}
