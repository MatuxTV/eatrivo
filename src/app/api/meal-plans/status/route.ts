import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "../../../../../src/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RequestLock } from "@/lib/redis";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const lockKey = `meal-plan-generation:${session.user.id}`;
    const isGenerating = await RequestLock.isLocked(lockKey);
    
    if (isGenerating) {
      const remainingTime = await RequestLock.getRemainingTime(lockKey);
      return NextResponse.json({
        isGenerating: true,
        remainingTime,
        message: "Meal plan generation in progress",
      });
    }

    return NextResponse.json({
      isGenerating: false,
      message: "No generation in progress",
    });

  } catch (error) {
    console.error("Error checking meal plan status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
