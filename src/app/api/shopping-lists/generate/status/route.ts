import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { RequestLock, GenerationProgress } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * GET /api/shopping-lists/generate/status
 * Returns current generation progress for the authenticated user.
 * The frontend polls this every ~2 seconds during generation.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rl = await checkRateLimit(`user:${userId}`, "standard");
    if (!rl.success) return rl.response!;

    const lockKey = `shopping-list-generation:${userId}`;
    const isLocked = await RequestLock.isLocked(lockKey);

    // Read progress from Redis
    const progressData = await GenerationProgress.get(userId);

    // Case 1: Error stored in progress → generation failed
    if (progressData?.error) {
      // Clean up
      await GenerationProgress.clear(userId);
      return NextResponse.json({
        isGenerating: false,
        error: progressData.error,
      });
    }

    // Case 2: Done flag set → generation completed successfully
    if (progressData?.done) {
      // Clean up
      await GenerationProgress.clear(userId);
      return NextResponse.json({
        isGenerating: false,
        done: true,
        progress: 100,
        label: "loader.done",
      });
    }

    // Case 3: Lock active → generation in progress
    if (isLocked) {
      return NextResponse.json({
        isGenerating: true,
        progress: progressData?.progress ?? 5,
        label: progressData?.label ?? "loader.fetchingProfile",
        retryCount: progressData?.retryCount ?? 0,
        remainingTime: await RequestLock.getRemainingTime(lockKey),
      });
    }

    // Case 4: No lock, no done flag, no error → nothing happening
    // Clean up any stale progress data just in case
    if (progressData) {
      await GenerationProgress.clear(userId);
    }

    return NextResponse.json({
      isGenerating: false,
      message: "No generation in progress",
    });
  } catch (error) {
    console.error("Error checking shopping list generation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
