import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { users, userProfiles, shoppingLists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assignTemplateToUser } from "@/lib/template-assignment";
import { apiLogger } from "@/lib/logger";

/**
 * POST /api/admin/assign-templates-bulk
 * Assign templates to all basic users who don't have shopping lists
 * Admin only
 */
export async function POST() {
  try {
    const session = await auth();

    // Check if user is admin/trainer
    if (
      !session?.user?.membership ||
      !["trainer", "admin"].includes(session.user.membership.toLowerCase())
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    apiLogger.info("Starting bulk template assignment", {
      metadata: { adminUserId: session.user.id },
    });

    // Get all basic users
    const basicUsers = await db.query.users.findMany({
      where: eq(users.membership, "basic"),
      columns: {
        id: true,
        name: true,
        email: true,
      },
    });

    const results = {
      total: basicUsers.length,
      processed: 0,
      assigned: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const user of basicUsers) {
      try {
        // Get user profile
        const userProfile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, user.id),
        });

        if (!userProfile) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "skipped",
            reason: "No profile found",
          });
          continue;
        }

        // Check if user already has shopping lists
        const existingShoppingLists = await db.query.shoppingLists.findMany({
          where: eq(shoppingLists.userProfileId, userProfile.id),
          limit: 1,
        });

        if (existingShoppingLists.length > 0) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "skipped",
            reason: "Already has shopping lists",
          });
          continue;
        }

        // Assign template
        const result = await assignTemplateToUser(userProfile.id);

        results.processed++;

        if (result.shoppingList) {
          results.assigned++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "assigned",
            shoppingListId: result.shoppingList.id,
            mealPlanId: result.mealPlan?.id,
          });

          apiLogger.info("Template assigned in bulk operation", {
            metadata: {
              userId: user.id,
              userProfileId: userProfile.id,
              shoppingListId: result.shoppingList.id,
            },
          });
        } else {
          results.failed++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "failed",
            reason: result.fallbackReason || "Unknown",
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          userId: user.id,
          email: user.email,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });

        apiLogger.error("Error assigning template in bulk", error, {
          metadata: { userId: user.id },
        });
      }
    }

    apiLogger.info("Bulk template assignment completed", {
      metadata: results,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} users, assigned ${results.assigned} templates`,
      results,
    });
  } catch (error) {
    apiLogger.error("Failed bulk template assignment", error);
    return NextResponse.json(
      {
        error: "Failed to assign templates",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
