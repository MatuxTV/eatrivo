import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/index";
import { pantryItems, shoppingLists, userInfoTable, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/redis";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

// POST /api/pantry/import/[shoppingListId]
// Parses shopping list markdown → inserts pantry items with source: "shopping_list"
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shoppingListId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shoppingListId } = await params;

  try {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    // Verify ownership
    const shoppingList = await db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.id, shoppingListId),
        eq(shoppingLists.userProfileId, userProfile.id),
      ),
    });
    if (!shoppingList) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 },
      );
    }

    // Use Gemini to parse shopping list markdown into structured items
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey,
      maxOutputTokens: 4096,
      temperature: 0,
    });

    const prompt = `You are a structured data extractor. Parse this shopping list markdown and extract all items.

Return ONLY valid JSON array. Each item: { "name": string, "quantity": number | null, "unit": string | null }

SHOPPING LIST MARKDOWN:
${shoppingList.markdownContent}

Return JSON array only, no explanation, no markdown:`;

    const response = await model.invoke([{ role: "user", content: prompt }]);
    const raw =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Parse JSON from response, strip possible markdown code fences
    const jsonStr = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    let parsed: {
      name: string;
      quantity: number | null;
      unit: string | null;
    }[];
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      apiLogger.error("Failed to parse AI import response", { raw });
      return NextResponse.json(
        { error: "Failed to parse items from shopping list" },
        { status: 422 },
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ imported: 0, items: [] });
    }

    const locale = userInfo?.language ?? "sk";
    const validParsedItems = parsed.filter(
      (item) => item.name && typeof item.name === "string",
    );

    // Insert all items
    const toInsert = await Promise.all(validParsedItems
      .map(async (item) => {
        const normalizedName = item.name.trim();

        return {
          userProfileId: userProfile.id,
          name: normalizedName,
          ingredientName: null,
          ingredientKey: null,
          ingredientSpecificKey: null,
          quantity:
            item.quantity !== null && item.quantity !== undefined
              ? String(item.quantity)
              : null,
          unit: item.unit ? normalizeUnit(item.unit) : null,
          category: guessFoodCategory(normalizedName),
          source: "shopping_list" as const,
          shoppingListId,
        };
      }));

    const insertedItems = await db
      .insert(pantryItems)
      .values(toInsert)
      .returning();

    // Invalidate pantry cache
    await CacheService.del(`pantry:${userProfile.id}`);
    after(async () => {
      await normalizePantryItemsInBackground({
        source: "pantry-shopping-list-import",
        userProfileId: userProfile.id,
        locale,
        pantryItemIds: insertedItems.map((item) => item.id),
      });
    });

    apiLogger.info("Pantry import completed", {
      metadata: {
        userProfileId: userProfile.id,
        shoppingListId,
        imported: insertedItems.length,
      },
    });

    return NextResponse.json({
      imported: insertedItems.length,
      items: insertedItems,
      normalizationQueued: true,
    });
  } catch (error) {
    apiLogger.error("POST /api/pantry/import error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
