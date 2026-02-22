import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { shoppingLists, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";

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
