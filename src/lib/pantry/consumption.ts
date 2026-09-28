import { asc, eq } from "drizzle-orm";

import { pantryItems } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import {
  invalidatePantryCaches,
  parseStoredQuantity,
  serializeQuantity,
} from "@/lib/pantry/restock";
import { matchPantryIngredient } from "@/lib/ingredients/ingredient-matching";
import { loadIngredientGraph } from "@/lib/pantry/ingredient-resolution";
import { toCanonicalQuantity } from "@/lib/ingredients/units";

export interface PantryRecipeConsumptionIngredient {
  name: string;
  quantityValue?: number | null;
  unit?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
}

export interface PantryRecipeConsumptionMatch {
  recipeIngredientName: string;
  pantryIngredientName: string | null;
  matchType: "exact" | "fallback";
}

export interface ConsumeRecipeFromPantryInput {
  userProfileId: string;
  recipeId?: string;
  recipeTitle: string;
  ingredientItems: PantryRecipeConsumptionIngredient[];
  matchedIngredients: PantryRecipeConsumptionMatch[];
}

export interface ConsumeRecipeFromPantryResult {
  updatedItems: number;
  deletedItems: number;
  consumedIngredients: number;
  skippedIngredients: number;
}

interface MutablePantryRow {
  id: string;
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  ingredientId: string | null;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: number | null;
  unit: string | null;
  changed: boolean;
  deleted: boolean;
}

function normalizeLookup(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function roundQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 1000) / 1000;
}

function getCanonicalMultiplier(unit: string): number | null {
  const canonicalOne = toCanonicalQuantity(1, unit);
  return canonicalOne ? canonicalOne.value : null;
}

function buildMatchedPantryNameMap(
  matches: PantryRecipeConsumptionMatch[],
): Map<string, Set<string>> {
  const matchedNameMap = new Map<string, Set<string>>();

  for (const match of matches) {
    const recipeIngredientName = normalizeLookup(match.recipeIngredientName);
    const pantryIngredientName = normalizeLookup(match.pantryIngredientName);

    if (!recipeIngredientName || !pantryIngredientName) {
      continue;
    }

    const existing = matchedNameMap.get(recipeIngredientName);
    if (existing) {
      existing.add(pantryIngredientName);
      continue;
    }

    matchedNameMap.set(recipeIngredientName, new Set([pantryIngredientName]));
  }

  return matchedNameMap;
}

function pantryRowMatchesIngredient(
  row: MutablePantryRow,
  ingredient: PantryRecipeConsumptionIngredient,
  pantryNameTargets: Set<string> | undefined,
  resolveIngredientId: (ingredient: PantryRecipeConsumptionIngredient) => string | null,
  graph: Awaited<ReturnType<typeof loadIngredientGraph>> | null,
): boolean {
  const recipeIngredientId = resolveIngredientId(ingredient);

  if (
    matchPantryIngredient(
      row,
      {
        ingredientId: recipeIngredientId,
        ingredientKey: ingredient.ingredientKey ?? null,
        ingredientSpecificKey: ingredient.ingredientSpecificKey ?? null,
      },
      graph,
    ).matched
  ) {
    return true;
  }

  if (!pantryNameTargets || pantryNameTargets.size === 0) {
    return false;
  }

  return pantryNameTargets.has(normalizeLookup(row.ingredientName ?? row.name));
}

export async function consumeRecipeFromPantry(
  input: ConsumeRecipeFromPantryInput,
): Promise<ConsumeRecipeFromPantryResult> {
  apiLogger.debug("[pantry.consumeRecipe] loading pantry rows", {
    metadata: {
      userProfileId: input.userProfileId,
      recipeId: input.recipeId ?? null,
      recipeTitle: input.recipeTitle,
      ingredientCount: input.ingredientItems.length,
      matchedIngredientCount: input.matchedIngredients.length,
    },
  });

  const pantryRows = await db
    .select({
      id: pantryItems.id,
      name: pantryItems.name,
      ingredientName: pantryItems.ingredientName,
      ingredientKey: pantryItems.ingredientKey,
      ingredientSpecificKey: pantryItems.ingredientSpecificKey,
      ingredientId: pantryItems.ingredientId,
      trackingMode: pantryItems.trackingMode,
      inStock: pantryItems.inStock,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
    })
    .from(pantryItems)
    .where(eq(pantryItems.userProfileId, input.userProfileId))
    .orderBy(asc(pantryItems.createdAt));

  const mutableRows: MutablePantryRow[] = pantryRows.map((row) => ({
    id: row.id,
    name: row.name,
    ingredientName: row.ingredientName,
    ingredientKey: row.ingredientKey,
    ingredientSpecificKey: row.ingredientSpecificKey,
    ingredientId: row.ingredientId,
    trackingMode: row.trackingMode,
    inStock: row.inStock,
    quantity: parseStoredQuantity(row.quantity),
    unit: row.unit,
    changed: false,
    deleted: false,
  }));
  const ingredientGraph = await loadIngredientGraph("en");
  const resolveIngredientId = (
    ingredient: PantryRecipeConsumptionIngredient,
  ): string | null => {
    const key = ingredient.ingredientSpecificKey ?? ingredient.ingredientKey;
    return key ? ingredientGraph.idByKey.get(key) ?? null : null;
  };
  const matchedPantryNames = buildMatchedPantryNameMap(input.matchedIngredients);

  let consumedIngredients = 0;
  let skippedIngredients = 0;

  for (const ingredient of input.ingredientItems) {
    const recipeIngredientName = normalizeLookup(ingredient.name);
    const pantryNameTargets = matchedPantryNames.get(recipeIngredientName);
    const hasKeyMatchTarget = Boolean(
      ingredient.ingredientSpecificKey || ingredient.ingredientKey,
    );

    if (
      !recipeIngredientName ||
      (!hasKeyMatchTarget && (!pantryNameTargets || pantryNameTargets.size === 0))
    ) {
      apiLogger.debug("[pantry.consumeRecipe] ingredient skipped without pantry match", {
        metadata: {
          userProfileId: input.userProfileId,
          recipeIngredientName: ingredient.name,
          recipeIngredientKey: ingredient.ingredientKey ?? null,
          recipeIngredientSpecificKey: ingredient.ingredientSpecificKey ?? null,
        },
      });
      skippedIngredients += 1;
      continue;
    }

    const requiredQuantity = ingredient.quantityValue ?? null;
    const requiredUnit = ingredient.unit ?? null;

    if (requiredQuantity === null || requiredUnit === null) {
      apiLogger.debug("[pantry.consumeRecipe] ingredient skipped without quantity", {
        metadata: {
          userProfileId: input.userProfileId,
          recipeIngredientName: ingredient.name,
          quantityValue: requiredQuantity,
          unit: requiredUnit,
        },
      });
      skippedIngredients += 1;
      continue;
    }

    const canonicalRequired = toCanonicalQuantity(requiredQuantity, requiredUnit);
    if (!canonicalRequired) {
      apiLogger.debug("[pantry.consumeRecipe] ingredient skipped because unit conversion failed", {
        metadata: {
          userProfileId: input.userProfileId,
          recipeIngredientName: ingredient.name,
          quantityValue: requiredQuantity,
          unit: requiredUnit,
        },
      });
      skippedIngredients += 1;
      continue;
    }

    let remainingCanonicalQuantity = canonicalRequired.value;
    let ingredientConsumed = false;

    for (const row of mutableRows) {
      if (remainingCanonicalQuantity <= 0) {
        break;
      }

      if (
        !pantryRowMatchesIngredient(
          row,
          ingredient,
          pantryNameTargets,
          resolveIngredientId,
          ingredientGraph,
        ) ||
        row.quantity === null ||
        !row.unit
      ) {
        continue;
      }

      const canonicalRow = toCanonicalQuantity(row.quantity, row.unit);
      if (
        !canonicalRow ||
        canonicalRow.dimension !== canonicalRequired.dimension ||
        canonicalRow.unit !== canonicalRequired.unit ||
        canonicalRow.value <= 0
      ) {
        continue;
      }

      const consumedFromRow = Math.min(
        canonicalRow.value,
        remainingCanonicalQuantity,
      );
      const nextCanonicalQuantity = canonicalRow.value - consumedFromRow;
      const canonicalMultiplier = getCanonicalMultiplier(row.unit);

      if (!canonicalMultiplier) {
        apiLogger.debug("[pantry.consumeRecipe] pantry row skipped because multiplier was unavailable", {
          metadata: {
            userProfileId: input.userProfileId,
            pantryItemId: row.id,
            pantryItemName: row.name,
            unit: row.unit,
          },
        });
        continue;
      }

      const previousQuantity = row.quantity;
      const nextStoredQuantity = roundQuantity(
        nextCanonicalQuantity / canonicalMultiplier,
      );

      if (row.trackingMode === "quantity" && nextStoredQuantity <= 0) {
        row.quantity = 0;
        row.deleted = true;
      } else {
        row.quantity = nextStoredQuantity;
      }

      if (row.trackingMode === "availability") {
        row.inStock = nextStoredQuantity > 0;
      }

      row.changed = true;
      ingredientConsumed = true;
      remainingCanonicalQuantity = roundQuantity(
        remainingCanonicalQuantity - consumedFromRow,
      );

      apiLogger.debug("[pantry.consumeRecipe] pantry row decremented", {
        metadata: {
          userProfileId: input.userProfileId,
          recipeIngredientName: ingredient.name,
          recipeIngredientKey: ingredient.ingredientKey ?? null,
          recipeIngredientSpecificKey: ingredient.ingredientSpecificKey ?? null,
          pantryItemId: row.id,
          pantryItemName: row.name,
          pantryIngredientKey: row.ingredientKey,
          pantryIngredientSpecificKey: row.ingredientSpecificKey,
          previousQuantity,
          nextQuantity: row.quantity,
          nextInStock: row.inStock,
          deleted: row.deleted,
          unit: row.unit,
          consumedCanonicalQuantity: consumedFromRow,
          remainingCanonicalQuantity,
        },
      });
    }

    if (ingredientConsumed) {
      consumedIngredients += 1;
    } else {
      apiLogger.debug("[pantry.consumeRecipe] ingredient skipped after pantry scan", {
        metadata: {
          userProfileId: input.userProfileId,
          recipeIngredientName: ingredient.name,
          recipeIngredientKey: ingredient.ingredientKey ?? null,
          recipeIngredientSpecificKey: ingredient.ingredientSpecificKey ?? null,
          requiredQuantity,
          requiredUnit,
        },
      });
      skippedIngredients += 1;
    }
  }

  const changedRows = mutableRows.filter((row) => row.changed);
  const updatedRows = changedRows.filter((row) => !row.deleted);
  const deletedRows = changedRows.filter((row) => row.deleted);

  for (const row of updatedRows) {
    await db
      .update(pantryItems)
      .set({
        quantity: serializeQuantity(row.quantity),
        ...(row.trackingMode === "availability"
          ? { inStock: row.inStock }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(pantryItems.id, row.id));
  }

  for (const row of deletedRows) {
    await db.delete(pantryItems).where(eq(pantryItems.id, row.id));
  }

  if (changedRows.length > 0) {
    await invalidatePantryCaches(input.userProfileId);
  }

  apiLogger.info("[pantry.consumeRecipe] pantry consumption applied", {
    metadata: {
      userProfileId: input.userProfileId,
      recipeId: input.recipeId ?? null,
      recipeTitle: input.recipeTitle,
      updatedItems: updatedRows.length,
      deletedItems: deletedRows.length,
      consumedIngredients,
      skippedIngredients,
    },
  });

  return {
    updatedItems: updatedRows.length,
    deletedItems: deletedRows.length,
    consumedIngredients,
    skippedIngredients,
  };
}