import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import {
  acquirePantryDraftLock,
  discardPantryDrafts,
  getPantryDraftTtlSeconds,
  getPantryDrafts,
  releasePantryDraftLock,
} from "@/lib/pantry/draft-cache";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { invalidatePantryCaches } from "@/lib/pantry/restock";
import { planDraftMerge } from "@/lib/pantry/draft-merge";
import { PANTRY_QUANTITY_TRACKING } from "@/lib/config/features";
import { loadIngredientGraph } from "@/lib/pantry/ingredient-resolution";
import {
  ensureUserIngredient,
  type EnsuredUserIngredient,
} from "@/lib/pantry/user-ingredients";
import { classifyUserIngredient } from "@/lib/pantry/ingredient-classification";

function parseTokens(body: unknown): string[] | undefined {
  const tokens = (body as { tokens?: unknown[] } | null)?.tokens;
  if (!Array.isArray(tokens)) {
    return undefined;
  }

  return tokens.filter((value): value is string => typeof value === "string");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identifier = getRateLimitIdentifier(
    req as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let userProfileId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const tokens = parseTokens(body);

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    userProfileId = userProfile.id;
    const lockAcquired = await acquirePantryDraftLock(userProfileId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Another pantry draft action is already in progress." },
        { status: 409 },
      );
    }

    try {
      const drafts = await getPantryDrafts(userProfileId);
      const selectedDrafts =
        !tokens || tokens.length === 0
          ? drafts
          : drafts.filter((draft) => tokens.includes(draft.token));

      if (selectedDrafts.length === 0) {
        return NextResponse.json(
          { error: "No pending pantry drafts found." },
          { status: 404 },
        );
      }

      const [ingredientGraph, userInfo] = await Promise.all([
        loadIngredientGraph("en"),
        db.query.userInfoTable.findFirst({
          where: eq(userInfoTable.userProfileId, userProfileId),
        }),
      ]);
      const locale = userInfo?.language ?? "sk";

      // [PANTRY_QUANTITY_TRACKING] flag off: presence only, so a draft that already exists in the
      // pantry (or twice in the batch) must not create a duplicate row.
      let draftsToInsert = selectedDrafts;
      let mergedCount = 0;
      if (!PANTRY_QUANTITY_TRACKING) {
        const existingRows = await db
          .select({
            id: pantryItems.id,
            name: pantryItems.name,
            ingredientKey: pantryItems.ingredientKey,
            ingredientSpecificKey: pantryItems.ingredientSpecificKey,
            inStock: pantryItems.inStock,
          })
          .from(pantryItems)
          .where(eq(pantryItems.userProfileId, userProfileId));
        const plan = planDraftMerge(selectedDrafts, existingRows);
        draftsToInsert = plan.toInsert;
        mergedCount = plan.mergedCount;
        if (plan.restockRowIds.length > 0) {
          await db
            .update(pantryItems)
            .set({ inStock: true })
            .where(inArray(pantryItems.id, plan.restockRowIds));
        }
      }

      // Drafts the resolver could not map become private user ingredients,
      // same as a manual add, so they are linked and classified later.
      const userIngredientByToken = new Map<string, EnsuredUserIngredient>();
      for (const draft of draftsToInsert) {
        if (draft.ingredientKey || draft.ingredientSpecificKey) {
          continue;
        }
        const userIngredient = await ensureUserIngredient({
          userId: session.user.id,
          locale,
          rawName: draft.name,
        });
        if (userIngredient) {
          userIngredientByToken.set(draft.token, userIngredient);
        }
      }

      const insertedItems =
        draftsToInsert.length === 0
          ? []
          : await db
              .insert(pantryItems)
              .values(
                draftsToInsert.map((draft) => {
                  const userIngredient = userIngredientByToken.get(draft.token);
                  const identityKey =
                    draft.ingredientSpecificKey ?? draft.ingredientKey;
                  return {
                    userProfileId: userProfileId as string,
                    name: draft.name,
                    ingredientName:
                      draft.ingredientName ??
                      (userIngredient ? userIngredient.canonicalName ?? draft.name : null),
                    ingredientKey:
                      draft.ingredientKey ?? userIngredient?.key ?? null,
                    ingredientSpecificKey:
                      draft.ingredientSpecificKey ?? userIngredient?.key ?? null,
                    ingredientId:
                      userIngredient?.id ??
                      (identityKey
                        ? ingredientGraph.idByKey.get(identityKey) ?? null
                        : null),
                    trackingMode: draft.trackingMode,
                    inStock: draft.inStock,
                    quantity: draft.quantity,
                    unit: draft.unit,
                    category: draft.category,
                    expiryDate: draft.expiryDate ? new Date(draft.expiryDate) : null,
                    source: "manual" as const,
                    shoppingListId: null,
                  };
                }),
              )
              .returning();

      const remainingDrafts = await discardPantryDrafts(
        userProfileId,
        selectedDrafts.map((draft) => draft.token),
      );
      await invalidatePantryCaches(userProfileId);

      const createdUserIngredients = [...userIngredientByToken.entries()].filter(
        ([, ingredient]) => ingredient.created,
      );
      if (createdUserIngredients.length > 0) {
        const classifyUserProfileId = userProfileId;
        const draftNameByToken = new Map(
          selectedDrafts.map((draft) => [draft.token, draft.name]),
        );
        after(async () => {
          for (const [token, ingredient] of createdUserIngredients) {
            await classifyUserIngredient({
              ingredientId: ingredient.id,
              userId: session.user.id,
              userProfileId: classifyUserProfileId,
              locale,
              rawName: draftNameByToken.get(token) ?? ingredient.key,
            });
          }
        });
      }

      return NextResponse.json({
        items: insertedItems,
        drafts: remainingDrafts,
        confirmedCount: insertedItems.length + mergedCount,
        mergedCount,
        ttlSeconds: getPantryDraftTtlSeconds(),
      });
    } finally {
      await releasePantryDraftLock(userProfileId);
    }
  } catch (error) {
    apiLogger.error("POST /api/pantry/drafts/confirm error", error, {
      metadata: { userId: session.user.id, userProfileId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}