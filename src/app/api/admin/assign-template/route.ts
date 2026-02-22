import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assignTemplateToUser } from "@/lib/template-assignment";
import { apiLogger } from "@/lib/logger";

/**
 * POST /api/admin/assign-template
 * Manually trigger template assignment for a user (admin only)
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;
    const { session } = authResult;

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    apiLogger.info("Manually triggering template assignment", {
      metadata: {
        adminUserId: session.user.id,
        targetUserId: userId,
        targetUserProfileId: userProfile.id,
      },
    });

    // Call template assignment
    const result = await assignTemplateToUser(userProfile.id);

    return NextResponse.json({
      success: true,
      result: {
        templateUsed: result.templateUsed,
        shoppingListCreated: !!result.shoppingList,
        mealPlanCreated: !!result.mealPlan,
        shoppingListId: result.shoppingList?.id,
        mealPlanId: result.mealPlan?.id,
        fallbackReason: result.fallbackReason,
      },
    });
  } catch (error) {
    apiLogger.error("Failed to manually assign template", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/assign-template
 * Trigger template assignment for current logged-in user (for testing)
 */
export async function GET() {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;
    const { session } = authResult;

    // Get user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id!),
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    apiLogger.info("Self-triggering template assignment", {
      metadata: {
        userId: session.user.id,
        userProfileId: userProfile.id,
      },
    });

    // Call template assignment
    const result = await assignTemplateToUser(userProfile.id);

    return NextResponse.json({
      success: true,
      result: {
        templateUsed: result.templateUsed,
        shoppingListCreated: !!result.shoppingList,
        mealPlanCreated: !!result.mealPlan,
        shoppingListId: result.shoppingList?.id,
        mealPlanId: result.mealPlan?.id,
        fallbackReason: result.fallbackReason,
      },
    });
  } catch (error) {
    apiLogger.error("Failed to self-assign template", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
