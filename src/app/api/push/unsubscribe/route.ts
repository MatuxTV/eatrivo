import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { pushSubscriptions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    // Delete the subscription matching this endpoint for this user
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, session.user.id),
          sql`${pushSubscriptions.subscription}->>'endpoint' = ${endpoint}`,
        ),
      );

    apiLogger.info("Deleted push subscription", {
      metadata: { userId: session.user.id, endpoint: endpoint.slice(0, 60) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error("Error deleting push subscription", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
