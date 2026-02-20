import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { RequestLock } from "@/lib/redis";

/**
 * GET /api/shopping-lists/generate/status
 * Check if a shopping list generation is currently in progress for the user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lockKey = `shopping-list-generation:${session.user.id}`;
    const isGenerating = await RequestLock.isLocked(lockKey);

    if (isGenerating) {
      const remainingTime = await RequestLock.getRemainingTime(lockKey);
      return NextResponse.json({
        isGenerating: true,
        remainingTime,
        message: "Shopping list generation in progress",
      });
    }

    return NextResponse.json({
      isGenerating: false,
      message: "No generation in progress",
    });
  } catch (error) {
    console.error("Error checking shopping list generation status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
