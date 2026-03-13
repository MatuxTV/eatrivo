import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { shoppingLists, userProfiles, userInfoTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { RequestLock, GenerationProgress } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rateLimit";
import { buildShoppingListGraph } from "@/lib/langgraph/shopping-list";
import { NODE_PROGRESS } from "@/lib/langgraph/shopping-list/constants";
import type { ShoppingListState } from "@/lib/langgraph/shopping-list/state";

/**
 * POST /api/shopping-lists/generate
 * Kick off a background shopping-list + meal-plan generation via LangGraph.
 * Returns 202 immediately; the client polls GET .../status for progress.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rl = await checkRateLimit(`user:${userId}`, "expensive");
    if (!rl.success) return rl.response!;

    const membership = session.user.membership?.toLowerCase();

    apiLogger.info("User requesting shopping list generation", {
      metadata: { userId, membership },
    });

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Get user info (nutrition data)
    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User nutrition data not found. Please complete onboarding." },
        { status: 404 },
      );
    }

    // Validate required fields
    const requiredFields = [
      "sex",
      "dateOfBirth",
      "height",
      "weight",
      "activity_level",
      "goal",
      "meal_per_day",
      "budget_preference",
    ] as const;

    for (const field of requiredFields) {
      if (!userInfo[field as keyof typeof userInfo]) {
        return NextResponse.json(
          {
            error: `Missing required field: ${field}. Please update your profile.`,
          },
          { status: 400 },
        );
      }
    }

    // Check if the user already has an active/in-progress shopping list
    const activeLists = await db
      .select({ id: shoppingLists.id, status: shoppingLists.status })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          inArray(shoppingLists.status, [
            "active",
            "draft",
            "approved",
            "purchased",
          ]),
        ),
      );

    if (activeLists.length > 0) {
      return NextResponse.json(
        {
          error:
            "You already have an active shopping list. Please complete or cancel it before generating a new one.",
        },
        { status: 400 },
      );
    }

    // Acquire generation lock (prevents duplicate requests & persists state across reloads)
    const lockKey = `shopping-list-generation:${userId}`;
    const lockAcquired = await RequestLock.acquire(lockKey, 300); // 5 min TTL

    if (!lockAcquired) {
      return NextResponse.json(
        {
          error:
            "Shopping list generation is already in progress. Please wait.",
        },
        { status: 429 },
      );
    }

    // Set initial progress
    await GenerationProgress.set(userId, {
      progress: 0,
      label: "loader.fetchingProfile",
      retryCount: 0,
    });

    // ─── Fire-and-forget: run LangGraph in the background via after() ──────
    after(async () => {
      try {
        const graph = buildShoppingListGraph();
        const stream = await graph.stream(
          { userId, userProfileId: userProfile.id },
          { streamMode: "updates" },
        );

        for await (const update of stream) {
          const nodeName = Object.keys(update)[0];
          const nodeState = (
            update as Record<string, Partial<typeof ShoppingListState.State>>
          )[nodeName];

          // Error in graph node
          if (nodeState?.error) {
            apiLogger.error("Shopping list graph node error", {
              metadata: { userId, node: nodeName, error: nodeState.error },
            });
            await GenerationProgress.set(userId, {
              progress: 0,
              label: "",
              retryCount: 0,
              error: nodeState.error,
            });
            break;
          }

          // Write progress to Redis
          const progressInfo = NODE_PROGRESS[nodeName];
          if (progressInfo) {
            await GenerationProgress.set(userId, {
              progress: progressInfo.progress,
              label: progressInfo.label,
              retryCount: nodeState?.retryCount ?? 0,
            });
          }

          // Done — save_to_db completed
          if (nodeName === "save_to_db" && nodeState?.savedShoppingList) {
            await GenerationProgress.set(userId, {
              progress: 100,
              label: "loader.done",
              retryCount: 0,
              done: true,
            });
          }
        }
      } catch (streamError) {
        apiLogger.error("Shopping list graph stream error", streamError, {
          metadata: { userId },
        });
        await GenerationProgress.set(userId, {
          progress: 0,
          label: "",
          retryCount: 0,
          error: "Failed to generate shopping list. Please try again.",
        });
      } finally {
        await RequestLock.release(lockKey);
      }
    });

    // Return immediately — client will poll /status
    return NextResponse.json({ started: true }, { status: 202 });
  } catch (error) {
    apiLogger.error(
      "Failed to generate shopping list for premium user",
      error,
      {
        metadata: { userId: (await auth())?.user?.id },
      },
    );
    return NextResponse.json(
      { error: "Failed to generate shopping list. Please try again." },
      { status: 500 },
    );
  }
}
