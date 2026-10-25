import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, count, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/pool";
import { recipeImages, recipeIngredients, recipeTranslations, recipes, userProfiles, users } from "@/db/schema";
import { checkSubscriptionStatus } from "@/lib/billing/subscription";
import { apiLogger } from "@/lib/logger";
import { isS3ClientConfigured } from "@/lib/storage/s3";

import { canSpend } from "./budget";
import {
  acquireRecipeImageLock,
  addMonthlySpendUsd,
  getMonthlySpendUsd,
  releaseRecipeImageLock,
} from "./budget-store";
import { getImagePriceUsd, getMonthlyBudgetUsd, getRecipeImageModel } from "./config";
import { isPaidMembership, isRecipeImageEligible, type RecipeImageOwner } from "./eligibility";
import { buildRecipeImagePrompt } from "./prompt";
import { generateRecipeImage } from "./provider";
import { getDishSignature } from "./signature";
import { loadImageProcessor, storeRecipeImage } from "./storage";
import { buildRecipeImageKey } from "./storage-keys";

export type EnsureRecipeImageResult =
  | { status: "exists" | "reused" | "generated"; imageId: string }
  | { status: "skipped"; reason: "budget" | "locked" | "not-found" | "not-eligible" | "no-storage" | "too-many-failures" }
  | { status: "failed"; error: string };

const MAX_INGREDIENTS = 6;
/** After this many failed attempts a recipe needs a manual look (admin upload). */
const MAX_FAILED_ATTEMPTS = 2;

async function loadRecipeForImage(recipeId: string) {
  const [recipe] = await db
    .select({
      id: recipes.id,
      coverImageId: recipes.coverImageId,
      legacyImageKey: recipes.imageKey,
      categoryKey: recipes.categoryKey,
      defaultLocale: recipes.defaultLocale,
      source: recipes.source,
      createdByUserId: recipes.createdByUserId,
    })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe) {
    return null;
  }

  const [translations, ingredientRows] = await Promise.all([
    db
      .select({ locale: recipeTranslations.locale, name: recipeTranslations.name })
      .from(recipeTranslations)
      .where(eq(recipeTranslations.recipeId, recipeId)),
    db
      .select({
        displayLabel: recipeIngredients.displayLabel,
        canonicalName: recipeIngredients.canonicalName,
        ingredientKey: recipeIngredients.ingredientKey,
      })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.sortOrder))
      .limit(MAX_INGREDIENTS),
  ]);

  const nameEn =
    translations.find((row) => row.locale === "en")?.name ??
    translations.find((row) => row.locale === recipe.defaultLocale)?.name ??
    translations[0]?.name ??
    "a home-cooked dish";

  return {
    ...recipe,
    nameEn,
    // English canonical names: the prompt is English, and localized labels
    // (e.g. Slovak) get rendered as text labels in the photo.
    ingredientLabels: ingredientRows
      .map((row) => row.canonicalName ?? row.displayLabel)
      .filter((label): label is string => Boolean(label)),
    ingredientKeys: ingredientRows
      .map((row) => row.ingredientKey ?? row.canonicalName)
      .filter((key): key is string => Boolean(key)),
  };
}

async function loadRecipeImageOwner(userId: string | null): Promise<RecipeImageOwner | null> {
  if (!userId) {
    return null;
  }

  const [owner] = await db
    .select({ membership: users.membership, role: userProfiles.role })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!owner) {
    return null;
  }

  // Only premium/pro can lapse; skip the subscription lookup for everyone else.
  const subscriptionExpired =
    isPaidMembership(owner.membership) && owner.role !== "admin"
      ? (await checkSubscriptionStatus(userId)).isExpired
      : false;

  return { role: owner.role, membership: owner.membership, subscriptionExpired };
}

/** Whether this user's own custom recipes get AI photos (admin or active paid membership). */
export async function canUserGetCustomRecipeImages(userId: string): Promise<boolean> {
  return isRecipeImageEligible({ source: "ai_custom", owner: await loadRecipeImageOwner(userId) });
}

export type RecipeCoverImageStatus =
  | { status: "ready"; storageKey: string }
  | { status: "pending" }
  | { status: "none" };

/** Cover photo state for clients waiting on a background generation. */
export async function getRecipeCoverImageStatus(recipeId: string): Promise<RecipeCoverImageStatus> {
  const [recipe] = await db
    .select({
      source: recipes.source,
      createdByUserId: recipes.createdByUserId,
      storageKey: recipeImages.storageKey,
      imageStatus: recipeImages.status,
    })
    .from(recipes)
    .leftJoin(recipeImages, eq(recipeImages.id, recipes.coverImageId))
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe) {
    return { status: "none" };
  }

  if (recipe.storageKey && recipe.imageStatus === "ready") {
    return { status: "ready", storageKey: recipe.storageKey };
  }

  const eligible =
    recipe.source === "catalog" ||
    isRecipeImageEligible({
      source: recipe.source,
      owner: await loadRecipeImageOwner(recipe.createdByUserId),
    });
  return eligible ? { status: "pending" } : { status: "none" };
}

/**
 * Makes sure a recipe has a cover photo: keeps an existing one, reuses the photo
 * of an identical dish, or generates a new one within the monthly budget.
 * Safe to call repeatedly and in parallel.
 */
export async function ensureRecipeImage(
  recipeId: string,
  options: { mode?: "live" | "batch"; dryRun?: boolean } = {},
): Promise<EnsureRecipeImageResult> {
  const recipe = await loadRecipeForImage(recipeId);
  if (!recipe) {
    return { status: "skipped", reason: "not-found" };
  }

  if (recipe.coverImageId) {
    return { status: "exists", imageId: recipe.coverImageId };
  }

  // Photos uploaded before recipe_images existed: adopt them for free.
  if (recipe.legacyImageKey) {
    if (options.dryRun) {
      return { status: "exists", imageId: "legacy" };
    }

    const [existing] = await db
      .select({ id: recipeImages.id })
      .from(recipeImages)
      .where(eq(recipeImages.storageKey, recipe.legacyImageKey))
      .limit(1);
    const legacyImageId =
      existing?.id ??
      (
        await db
          .insert(recipeImages)
          .values({
            recipeId,
            storageKey: recipe.legacyImageKey,
            status: "ready",
            source: "admin",
          })
          .returning({ id: recipeImages.id })
      )[0]!.id;

    await db
      .update(recipes)
      .set({ coverImageId: legacyImageId, updatedAt: new Date() })
      .where(eq(recipes.id, recipeId));
    return { status: "exists", imageId: legacyImageId };
  }

  // Photos are a paid perk for custom recipes: free users get none, not even a reused one.
  if (
    recipe.source !== "catalog" &&
    !isRecipeImageEligible({
      source: recipe.source,
      owner: await loadRecipeImageOwner(recipe.createdByUserId),
    })
  ) {
    return { status: "skipped", reason: "not-eligible" };
  }

  const dishSignature = getDishSignature({
    nameEn: recipe.nameEn,
    ingredientKeys: recipe.ingredientKeys,
  });

  if (!options.dryRun) {
    await db
      .update(recipes)
      .set({ dishSignature })
      .where(and(eq(recipes.id, recipeId), isNull(recipes.dishSignature)));
  }

  const [sameDish] = await db
    .select({ id: recipeImages.id })
    .from(recipeImages)
    .where(and(eq(recipeImages.dishSignature, dishSignature), eq(recipeImages.status, "ready")))
    .limit(1);

  if (sameDish) {
    if (!options.dryRun) {
      await db
        .update(recipes)
        .set({ coverImageId: sameDish.id, updatedAt: new Date() })
        .where(eq(recipes.id, recipeId));
    }
    return { status: "reused", imageId: sameDish.id };
  }

  if (!isS3ClientConfigured()) {
    return { status: "skipped", reason: "no-storage" };
  }

  const [failedAttempts] = await db
    .select({ value: count() })
    .from(recipeImages)
    .where(and(eq(recipeImages.recipeId, recipeId), eq(recipeImages.status, "failed")));
  if ((failedAttempts?.value ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return { status: "skipped", reason: "too-many-failures" };
  }

  const model = getRecipeImageModel();
  const price = getImagePriceUsd(model, options.mode ?? "live");
  if (!canSpend(await getMonthlySpendUsd(), price, getMonthlyBudgetUsd())) {
    return { status: "skipped", reason: "budget" };
  }

  if (options.dryRun) {
    return { status: "generated", imageId: "dry-run" };
  }

  if (!(await acquireRecipeImageLock(recipeId))) {
    return { status: "skipped", reason: "locked" };
  }

  const imageId = randomUUID();
  const prompt = buildRecipeImagePrompt({
    nameEn: recipe.nameEn,
    mainIngredients: recipe.ingredientLabels,
    categoryKey: recipe.categoryKey,
  });

  try {
    await db.insert(recipeImages).values({
      id: imageId,
      recipeId,
      storageKey: buildRecipeImageKey(recipeId, imageId, "full"),
      status: "pending",
      source: "ai",
      model,
      prompt,
      dishSignature,
    });

    // Fail before the paid generation call if images cannot be processed here.
    await loadImageProcessor();
    const generated = await generateRecipeImage(prompt, { model });
    await addMonthlySpendUsd(price);
    const stored = await storeRecipeImage(recipeId, imageId, generated.bytes);

    await db
      .update(recipeImages)
      .set({
        status: "ready",
        width: stored.width,
        height: stored.height,
        bytes: stored.bytes,
        updatedAt: new Date(),
      })
      .where(eq(recipeImages.id, imageId));
    await db
      .update(recipes)
      .set({ coverImageId: imageId, updatedAt: new Date() })
      .where(eq(recipes.id, recipeId));

    return { status: "generated", imageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    apiLogger.error("[recipe-images] generation failed", error, { metadata: { recipeId } });
    await db
      .update(recipeImages)
      .set({ status: "failed", error: message.slice(0, 500), updatedAt: new Date() })
      .where(eq(recipeImages.id, imageId))
      .catch(() => undefined);
    return { status: "failed", error: message };
  } finally {
    await releaseRecipeImageLock(recipeId).catch(() => undefined);
  }
}
