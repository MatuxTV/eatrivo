import { auth } from "../../../../../auth";
import { db } from "@/index";
import { users, userProfiles, chatMessages } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { unauthorizedError } from "@/lib/safeError";

const DAILY_MESSAGE_LIMIT_BASIC = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedError();

  // Get user membership
  const [user] = await db
    .select({ membership: users.membership })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Premium/pro/trainer users have no limit
  if (user.membership !== "basic") {
    return Response.json({
      limited: false,
      limit: null,
      used: 0,
      remaining: null,
    });
  }

  // Count today's messages for basic users
  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ count: todayCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userProfileId, profile.id),
        eq(chatMessages.role, "user"),
        gte(chatMessages.createdAt, todayStart),
      ),
    );

  return Response.json({
    limited: true,
    limit: DAILY_MESSAGE_LIMIT_BASIC,
    used: todayCount,
    remaining: Math.max(0, DAILY_MESSAGE_LIMIT_BASIC - todayCount),
  });
}
