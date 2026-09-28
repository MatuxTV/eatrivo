import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import {
  ingredientAliases,
  ingredientNames,
  ingredients,
} from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import {
  invalidateIngredientAliasIndexCache,
  loadIngredientAliasIndex,
  loadIngredientGraph,
} from "@/lib/pantry/ingredient-resolution";
import {
  buildClassificationPrompt,
  getPrivateDuplicateLookupKey,
  parseClassification,
  planClassification,
} from "@/lib/pantry/ingredient-classification-core";
import { invalidatePantryCaches } from "@/lib/pantry/restock";
import {
  buildUserAliasValues,
  findPrivateIngredient,
  mergePrivateIngredient,
  rekeyPrivateIngredient,
} from "@/lib/pantry/user-ingredients";

export async function classifyUserIngredient(input: {
  ingredientId: string;
  userId: string;
  userProfileId: string;
  locale: string;
  rawName: string;
}): Promise<void> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return;
  }

  try {
    const [aliasIndex, graph] = await Promise.all([
      loadIngredientAliasIndex("en"),
      loadIngredientGraph("en"),
    ]);

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey,
      maxOutputTokens: 2048,
      temperature: 0,
    });

    const response = await model.invoke([
      new HumanMessage(
        buildClassificationPrompt({
          rawName: input.rawName,
          locale: input.locale,
          knownKeys: [...aliasIndex.validKeys],
        }),
      ),
    ]);

    const contentText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const result = parseClassification(contentText);

    if (!result) {
      apiLogger.warn("[ingredient.classify] unparseable AI response", {
        metadata: { ingredientId: input.ingredientId },
      });
      return;
    }

    const duplicateLookupKey = getPrivateDuplicateLookupKey(result, graph);
    const privateDuplicate = duplicateLookupKey
      ? await findPrivateIngredient(input.userId, duplicateLookupKey)
      : null;

    const plan = planClassification({
      ingredientId: input.ingredientId,
      rawName: input.rawName,
      result,
      graph,
      privateDuplicate,
    });

    if (plan.action.type === "merge") {
      await mergePrivateIngredient({
        privateIngredientId: input.ingredientId,
        target: plan.action.target,
        userId: input.userId,
        locale: input.locale,
        learnedNames: plan.learnedNames,
      });
      await invalidatePantryCaches(input.userProfileId);
      apiLogger.info("[ingredient.classify] merged user ingredient", {
        metadata: {
          ingredientId: input.ingredientId,
          reason: plan.action.reason,
          targetKey: plan.action.target.key,
        },
      });
      return;
    }

    if (plan.action.type === "rekey") {
      await rekeyPrivateIngredient({
        ingredientId: input.ingredientId,
        key: plan.action.key,
        familyKey: plan.action.familyKey,
      });
      await invalidatePantryCaches(input.userProfileId);
    }

    await db
      .update(ingredients)
      .set({
        canonicalName:
          result.englishName?.trim() || result.localizedName?.trim() || undefined,
        parentId: plan.parentId,
        reviewState: plan.reviewState,
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, input.ingredientId));

    const names: { locale: string; name: string }[] = [];
    if (result.englishName?.trim()) {
      names.push({ locale: "en", name: result.englishName.trim() });
    }
    if (result.localizedName?.trim()) {
      names.push({ locale: input.locale, name: result.localizedName.trim() });
    }

    if (names.length > 0) {
      await db
        .insert(ingredientNames)
        .values(
          names.map((entry) => ({
            ingredientId: input.ingredientId,
            locale: entry.locale,
            name: entry.name,
          })),
        )
        .onConflictDoNothing();

      const aliasValues = names.flatMap((entry) =>
        buildUserAliasValues({
          ingredientId: input.ingredientId,
          userId: input.userId,
          locale: entry.locale,
          names: [entry.name],
        }),
      );

      if (aliasValues.length > 0) {
        await db
          .insert(ingredientAliases)
          .values(aliasValues)
          .onConflictDoNothing();
      }
    }

    invalidateIngredientAliasIndexCache();
    apiLogger.info("[ingredient.classify] classified user ingredient", {
      metadata: {
        ingredientId: input.ingredientId,
        isFoodIngredient: result.isFoodIngredient,
        action: plan.action.type,
        reviewState: plan.reviewState,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    apiLogger.error("[ingredient.classify] failed", error, {
      metadata: { ingredientId: input.ingredientId },
    });
  }
}
