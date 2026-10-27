import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { shoppingListItems, shoppingLists, userProfiles } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { handleApiError, safeErrorResponse, unauthorizedError } from "@/lib/safeError";

// An item counts as "frequently bought" once it was bought on this many separate lists.
const MIN_TIMES_BOUGHT = 2;
const MAX_FREQUENT_ITEMS = 12;

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedError("Unauthorized");
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return safeErrorResponse("User profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const nameKey = sql<string>`lower(trim(${shoppingListItems.name}))`;
    const timesBought = sql<number>`count(distinct ${shoppingListItems.shoppingListId})::int`;

    // Bought = checked out to the pantry, i.e. the item sits on a completed list.
    const rows = await db
      .select({
        name: sql<string>`min(trim(${shoppingListItems.name}))`,
        category: sql<string | null>`mode() within group (order by ${shoppingListItems.category})`,
        timesBought,
      })
      .from(shoppingListItems)
      .innerJoin(shoppingLists, eq(shoppingLists.id, shoppingListItems.shoppingListId))
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "completed"),
        ),
      )
      .groupBy(nameKey)
      .having(sql`${timesBought} >= ${MIN_TIMES_BOUGHT}`)
      .orderBy(desc(timesBought), desc(sql`max(${shoppingLists.updated_at})`))
      .limit(MAX_FREQUENT_ITEMS);

    return NextResponse.json({
      success: true,
      items: rows.map((row) => ({
        name: row.name,
        category: row.category ?? "other",
        timesBought: row.timesBought,
      })),
    });
  } catch (error) {
    apiLogger.error("Failed to fetch frequently bought items", error);
    return handleApiError(error, "GET /api/shopping-lists/frequent", {
      status: 500,
      code: "FREQUENT_ITEMS_FETCH_FAILED",
    });
  }
}
