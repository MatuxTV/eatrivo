// Admin chat analytics API — beta feature for monitoring Chat with Rivo
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { chatMessages, userProfiles } from "@/db/schema";
import { sql, gte, count, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If sessionId is provided, return messages for that session
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const messages = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          intent: chatMessages.intent,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.createdAt);

      return NextResponse.json({ messages });
    }

    // Otherwise return overview analytics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalMessagesResult,
      totalSessionsResult,
      uniqueUsersResult,
      messagesTodayResult,
      dailyMessages,
      topUsers,
      recentSessions,
    ] = await Promise.all([
      // Total messages
      db
        .select({ count: count() })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, thirtyDaysAgo)),

      // Total sessions
      db
        .select({
          count: sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})`,
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, thirtyDaysAgo)),

      // Unique users
      db
        .select({
          count: sql<number>`COUNT(DISTINCT ${chatMessages.userProfileId})`,
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, thirtyDaysAgo)),

      // Messages today
      db
        .select({ count: count() })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, todayStart)),

      // Daily messages for chart (last 30 days)
      db
        .select({
          date: sql<string>`DATE(${chatMessages.createdAt})`.as("date"),
          messageCount: count().as("messageCount"),
          sessionCount:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})`.as(
              "sessionCount",
            ),
          uniqueUsers:
            sql<number>`COUNT(DISTINCT ${chatMessages.userProfileId})`.as(
              "uniqueUsers",
            ),
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${chatMessages.createdAt})`)
        .orderBy(sql`DATE(${chatMessages.createdAt})`),

      // Top users by message count
      db
        .select({
          userProfileId: chatMessages.userProfileId,
          fullName: userProfiles.fullName,
          messageCount: count().as("messageCount"),
          sessionCount:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})`.as(
              "sessionCount",
            ),
          lastActive: sql<string>`MAX(${chatMessages.createdAt})`.as(
            "lastActive",
          ),
        })
        .from(chatMessages)
        .leftJoin(
          userProfiles,
          eq(chatMessages.userProfileId, userProfiles.id),
        )
        .where(gte(chatMessages.createdAt, thirtyDaysAgo))
        .groupBy(chatMessages.userProfileId, userProfiles.fullName)
        .orderBy(desc(count()))
        .limit(20),

      // Recent sessions with first message preview
      db
        .select({
          sessionId: chatMessages.sessionId,
          userProfileId: chatMessages.userProfileId,
          fullName: userProfiles.fullName,
          messageCount: count().as("messageCount"),
          firstMessage:
            sql<string>`MIN(CASE WHEN ${chatMessages.role} = 'user' THEN ${chatMessages.content} END)`.as(
              "firstMessage",
            ),
          lastMessage:
            sql<string>`MAX(${chatMessages.content})`.as("lastMessage"),
          startedAt: sql<string>`MIN(${chatMessages.createdAt})`.as(
            "startedAt",
          ),
        })
        .from(chatMessages)
        .leftJoin(
          userProfiles,
          eq(chatMessages.userProfileId, userProfiles.id),
        )
        .where(gte(chatMessages.createdAt, thirtyDaysAgo))
        .groupBy(
          chatMessages.sessionId,
          chatMessages.userProfileId,
          userProfiles.fullName,
        )
        .orderBy(desc(sql`MIN(${chatMessages.createdAt})`))
        .limit(50),
    ]);

    return NextResponse.json({
      overview: {
        totalMessages: totalMessagesResult[0]?.count || 0,
        totalSessions: totalSessionsResult[0]?.count || 0,
        uniqueUsers: uniqueUsersResult[0]?.count || 0,
        messagestoday: messagesTodayResult[0]?.count || 0,
      },
      dailyMessages,
      topUsers,
      recentSessions,
    });
  } catch (error) {
    console.error("[Admin Chat Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat analytics" },
      { status: 500 },
    );
  }
}
