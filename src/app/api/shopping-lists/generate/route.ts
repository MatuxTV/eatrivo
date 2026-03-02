import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { shoppingLists, userProfiles, userInfoTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { RequestLock } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rateLimit";
import { buildShoppingListGraph } from "@/lib/langgraph/shopping-list";
import { NODE_PROGRESS } from "@/lib/langgraph/shopping-list/constants";
import { ShoppingListState } from "@/lib/langgraph/shopping-list/state";

/**
 * POST /api/shopping-lists/generate
 * Generate a personalized shopping list and meal plan using LangGraph
 * SSE streaming with progress events
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "expensive");
    if (!rl.success) return rl.response!;

    const membership = session.user.membership?.toLowerCase();

    apiLogger.info("User requesting shopping list generation", {
      metadata: { userId: session.user.id, membership },
    });

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

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

    // Check if the user already has an active shopping list
    const activeLists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "active"),
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
    const lockKey = `shopping-list-generation:${session.user.id}`;
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

    // ─── SSE Stream via LangGraph ────────────────────────────────────────────
    const graph = buildShoppingListGraph();
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            const stream = await graph.stream(
              { userId: session.user!.id, userProfileId: userProfile.id },
              { streamMode: "updates" },
            );

            for await (const update of stream) {
              const nodeName = Object.keys(update)[0];
              const nodeState = (update as Record<string, Partial<typeof ShoppingListState.State>>)[nodeName];

              // Error event
              if (nodeState?.error) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      message: nodeState.error,
                    })}\n\n`,
                  ),
                );
                break;
              }

              // Progress event
              const progressInfo = NODE_PROGRESS[nodeName];
              if (progressInfo) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "progress",
                      node: nodeName,
                      progress: progressInfo.progress,
                      label: progressInfo.label,
                      retryCount: nodeState?.retryCount ?? 0,
                    })}\n\n`,
                  ),
                );
              }

              // Done event — when save_to_db completes with savedShoppingList
              if (nodeName === "save_to_db" && nodeState?.savedShoppingList) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "done",
                      shoppingList: nodeState.savedShoppingList,
                      mealPlan: nodeState.savedMealPlan ?? null,
                    })}\n\n`,
                  ),
                );
              }
            }
          } catch (streamError) {
            apiLogger.error("Shopping list graph stream error", streamError, {
              metadata: { userId: session.user!.id },
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message:
                    "Failed to generate shopping list. Please try again.",
                })}\n\n`,
              ),
            );
          } finally {
            await RequestLock.release(lockKey);
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      },
    );
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
