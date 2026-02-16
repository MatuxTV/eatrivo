import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { z } from "zod";
import { assignTemplateToUser } from "@/lib/template-assignment";
import { apiLogger } from "@/lib/logger";

// Schema for assignment request
const assignRequestSchema = z.object({
  userProfileId: z.string().uuid(),
});

/**
 * POST /api/admin/templates/assign
 * Manually trigger template assignment for a user
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin/trainer
    const session = await auth();
    if (
      !session?.user?.membership ||
      !["trainer", "admin"].includes(session.user.membership.toLowerCase())
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = assignRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { userProfileId } = validationResult.data;

    // Trigger template assignment
    apiLogger.info("Manually assigning template to user", {
      metadata: { userProfileId },
    });

    const result = await assignTemplateToUser(userProfileId);

    if (!result.shoppingList) {
      return NextResponse.json(
        {
          success: false,
          message: result.fallbackReason || "Template assignment failed",
          templateUsed: result.templateUsed,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      shoppingList: result.shoppingList,
      mealPlan: result.mealPlan,
      templateUsed: result.templateUsed,
    });
  } catch (error) {
    apiLogger.error("Error manually assigning template", error);
    return NextResponse.json(
      { error: "Failed to assign template" },
      { status: 500 },
    );
  }
}
