import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../";
import { shoppingLists } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const {
      title,
      description,
      weekStartDate,
      weekEndDate,
      status,
      userProfileId,
      markdownContent,
    } = body;

    // Validate required fields
    if (!title || !weekStartDate || !weekEndDate || !userProfileId || !markdownContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate markdown content is not empty
    if (!markdownContent.trim()) {
      return NextResponse.json(
        { error: "Markdown content cannot be empty" },
        { status: 400 }
      );
    }

    // Create shopping list
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values({
        userProfileId,
        title,
        description: description || null,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        markdownContent,
        status: status || "active",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        shoppingList: newShoppingList,
        message: "Shopping list created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to create shopping list" },
      { status: 500 }
    );
  }
}
