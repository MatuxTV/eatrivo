import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { shoppingLists, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/redis";

/**
 * GET /api/shopping-lists/[id]
 * Returns shopping list data as JSON (including markdownContent for inline viewer)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const [userProfile] = await db
      .select({ id: userProfiles.id, role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = ["admin", "coach"].includes(userProfile.role ?? "");

    const rows = isAdmin
      ? await db
          .select()
          .from(shoppingLists)
          .where(eq(shoppingLists.id, id))
          .limit(1)
      : await db
          .select()
          .from(shoppingLists)
          .where(
            and(
              eq(shoppingLists.id, id),
              eq(shoppingLists.userProfileId, userProfile.id),
            ),
          )
          .limit(1);

    const item = rows[0];
    if (!item) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: item.id,
      title: item.title,
      description: item.description,
      markdownContent: item.markdownContent,
      weekStartDate: item.weekStartDate,
      weekEndDate: item.weekEndDate,
      status: item.status,
    });
  } catch (error) {
    apiLogger.error("Error fetching shopping list", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/shopping-lists/[id]
 * Updates a shopping list's title and description
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Input length validation
    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be a string of max 200 characters" },
        { status: 400 },
      );
    }
    if (
      description !== undefined &&
      description !== null &&
      (typeof description !== "string" || description.length > 5000)
    ) {
      return NextResponse.json(
        { error: "Description must be a string of max 5000 characters" },
        { status: 400 },
      );
    }

    // Verify ownership and existence
    // First, find the user's profile ID
    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Verify the shopping list belongs to the user
    const [existingList] = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.id, id),
          eq(shoppingLists.userProfileId, userProfile.id),
        ),
      )
      .limit(1);

    if (!existingList) {
      return NextResponse.json(
        { error: "Shopping list not found or unauthorized" },
        { status: 404 },
      );
    }

    // Update the shopping list
    await db
      .update(shoppingLists)
      .set({
        title,
        description: description || undefined,
      })
      .where(eq(shoppingLists.id, id));

    // Invalidate cache for the user's shopping lists
    await CacheService.del(`shopping-lists:${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Shopping list updated successfully",
    });
  } catch (error) {
    apiLogger.error("Error updating shopping list", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/shopping-lists/[id]
 * Deletes a shopping list and its associated meal plans (via cascade)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const [existingList] = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.id, id),
          eq(shoppingLists.userProfileId, userProfile.id),
        ),
      )
      .limit(1);

    if (!existingList) {
      return NextResponse.json(
        { error: "Shopping list not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete the shopping list (cascade handles mealPlans & downloads)
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));

    // Invalidate cache for the user's shopping lists
    await CacheService.del(`shopping-lists:${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Shopping list deleted successfully",
    });
  } catch (error) {
    apiLogger.error("Error deleting shopping list", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
