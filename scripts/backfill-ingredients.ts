import "dotenv/config";

import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../src/index";
import {
  ingredientAliases,
  ingredientNames,
  ingredients,
  recipeIngredients,
  recipeIngredientTranslations,
} from "../src/db/schema";
import {
  buildIngredientAliasForms,
  deriveIngredientFamilyKey,
} from "../src/lib/ingredients/ingredient-family";
import { normalizeLookupValue } from "../src/lib/pantry/ingredient-resolution-core";

interface KeyAggregate {
  key: string;
  familyKey: string | null;
  recipeIds: Set<string>;
  namesByLocale: Map<string, Set<string>>;
  canonicalEn: string | null;
}

function addName(
  aggregate: KeyAggregate,
  locale: string,
  name: string | null,
): void {
  if (!name) {
    return;
  }

  const names = aggregate.namesByLocale.get(locale) ?? new Set<string>();
  names.add(name);
  aggregate.namesByLocale.set(locale, names);
}

function titleizeKey(key: string): string {
  return key.replace(/-/g, " ");
}

function resolveParentKey(
  aggregate: KeyAggregate,
  allKeys: Set<string>,
): string | null {
  if (
    aggregate.familyKey &&
    aggregate.familyKey !== aggregate.key &&
    allKeys.has(aggregate.familyKey)
  ) {
    return aggregate.familyKey;
  }

  const derived = deriveIngredientFamilyKey(aggregate.key, allKeys);
  if (derived && derived !== aggregate.key) {
    return derived;
  }

  return null;
}

async function main() {
  const rows = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      ingredientKey: recipeIngredients.ingredientKey,
      ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
      locale: recipeIngredientTranslations.locale,
      displayName: recipeIngredientTranslations.displayName,
    })
    .from(recipeIngredients)
    .innerJoin(
      recipeIngredientTranslations,
      eq(
        recipeIngredientTranslations.recipeIngredientId,
        recipeIngredients.id,
      ),
    );

  const aggregates = new Map<string, KeyAggregate>();
  const familyKeys = new Set<string>();

  for (const row of rows) {
    const specificKey = row.ingredientSpecificKey ?? row.ingredientKey;
    if (!specificKey) {
      continue;
    }

    const familyKey = row.ingredientKey ?? specificKey;
    familyKeys.add(familyKey);

    const aggregate = aggregates.get(specificKey) ?? {
      key: specificKey,
      familyKey,
      recipeIds: new Set<string>(),
      namesByLocale: new Map<string, Set<string>>(),
      canonicalEn: null,
    };

    aggregate.recipeIds.add(row.recipeId);
    addName(aggregate, row.locale, row.displayName);
    if (row.locale === "en" && row.displayName) {
      aggregate.canonicalEn = row.displayName;
    }

    aggregates.set(specificKey, aggregate);
  }

  const allKeys = new Set<string>([...aggregates.keys(), ...familyKeys]);

  const ingredientValues = [...allKeys].map((key) => {
    const aggregate = aggregates.get(key);
    const canonicalName =
      aggregate?.canonicalEn ??
      (aggregate
        ? [...(aggregate.namesByLocale.get("en") ?? [])][0] ?? titleizeKey(key)
        : titleizeKey(key));

    return {
      key,
      canonicalName,
      source: "recipe" as const,
      reviewState: "trusted" as const,
    };
  });

  await db.insert(ingredients).values(ingredientValues).onConflictDoNothing();

  const ingredientRows = await db
    .select({ id: ingredients.id, key: ingredients.key })
    .from(ingredients)
    .where(inArray(ingredients.key, [...allKeys]));

  const idByKey = new Map(ingredientRows.map((row) => [row.key, row.id]));

  const nameValues: {
    ingredientId: string;
    locale: string;
    name: string;
  }[] = [];

  for (const aggregate of aggregates.values()) {
    const ingredientId = idByKey.get(aggregate.key);
    if (!ingredientId) {
      continue;
    }

    for (const [locale, names] of aggregate.namesByLocale) {
      for (const name of names) {
        nameValues.push({ ingredientId, locale, name });
      }
    }
  }

  for (const familyKey of familyKeys) {
    if (aggregates.has(familyKey)) {
      continue;
    }

    const ingredientId = idByKey.get(familyKey);
    if (!ingredientId) {
      continue;
    }

    nameValues.push({
      ingredientId,
      locale: "en",
      name: titleizeKey(familyKey),
    });
  }

  if (nameValues.length > 0) {
    await db.insert(ingredientNames).values(nameValues).onConflictDoNothing();
  }

  const parentUpdates = [...aggregates.values()]
    .map((aggregate) => ({
      key: aggregate.key,
      parentKey: resolveParentKey(aggregate, allKeys),
    }))
    .filter((update): update is { key: string; parentKey: string } =>
      Boolean(update.parentKey),
    );

  for (const update of parentUpdates) {
    const ingredientId = idByKey.get(update.key);
    const parentId = idByKey.get(update.parentKey);
    if (ingredientId && parentId) {
      await db
        .update(ingredients)
        .set({ parentId, updatedAt: new Date() })
        .where(eq(ingredients.id, ingredientId));
    }
  }

  const recipeCountByKey = new Map<string, number>();
  for (const aggregate of aggregates.values()) {
    recipeCountByKey.set(aggregate.key, aggregate.recipeIds.size);
  }

  const orderedKeys = [...allKeys].sort((a, b) => {
    const countA = recipeCountByKey.get(a) ?? 0;
    const countB = recipeCountByKey.get(b) ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }
    return a.localeCompare(b);
  });

  const aliasValues: {
    ingredientId: string;
    locale: string | null;
    alias: string;
    source: "recipe";
  }[] = [];

  const seen = new Set<string>();
  function pushAlias(
    ingredientId: string,
    locale: string | null,
    rawAlias: string,
  ) {
    const alias = normalizeLookupValue(rawAlias);
    if (!alias) {
      return;
    }

    const dedupeKey = `${locale ?? "*"}:${alias}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);

    aliasValues.push({ ingredientId, locale, alias, source: "recipe" });
  }

  for (const key of orderedKeys) {
    const ingredientId = idByKey.get(key);
    if (!ingredientId) {
      continue;
    }

    const aggregate = aggregates.get(key);

    if (aggregate?.canonicalEn) {
      pushAlias(ingredientId, null, aggregate.canonicalEn);
      for (const form of buildIngredientAliasForms(aggregate.canonicalEn)) {
        pushAlias(ingredientId, null, form);
      }
    }

    for (const form of buildIngredientAliasForms(key)) {
      pushAlias(ingredientId, null, form);
    }

    if (aggregate) {
      for (const [locale, names] of aggregate.namesByLocale) {
        for (const name of names) {
          pushAlias(ingredientId, locale, name);
          for (const form of buildIngredientAliasForms(name)) {
            pushAlias(ingredientId, locale, form);
          }
        }
      }
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < aliasValues.length; i += CHUNK) {
    await db
      .insert(ingredientAliases)
      .values(aliasValues.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }

  await db.execute(sql`
    UPDATE recipe_ingredients ri
    SET ingredient_id = i.id
    FROM ingredients i
    WHERE i.key = COALESCE(ri.ingredient_specific_key, ri.ingredient_key)
      AND ri.ingredient_id IS DISTINCT FROM i.id
  `);

  await db.execute(sql`
    UPDATE recipe_ingredients ri
    SET display_label = COALESCE(
      (
        SELECT t.display_name FROM recipe_ingredient_translations t
        WHERE t.recipe_ingredient_id = ri.id AND t.locale = r.default_locale
        LIMIT 1
      ),
      (
        SELECT t.display_name FROM recipe_ingredient_translations t
        WHERE t.recipe_ingredient_id = ri.id AND t.locale = 'en'
        LIMIT 1
      ),
      (
        SELECT t.display_name FROM recipe_ingredient_translations t
        WHERE t.recipe_ingredient_id = ri.id
        LIMIT 1
      )
    )
    FROM recipes r
    WHERE r.id = ri.recipe_id AND ri.display_label IS NULL
  `);

  for (const table of [
    "pantry_items",
    "shopping_list_items",
    "pantry_restock_items",
  ]) {
    await db.execute(sql`
      UPDATE ${sql.identifier(table)} t
      SET ingredient_id = i.id
      FROM ingredients i
      WHERE i.key = COALESCE(t.ingredient_specific_key, t.ingredient_key)
        AND t.ingredient_id IS DISTINCT FROM i.id
    `);
  }

  const [counts] = await db
    .select({
      ingredientCount: sql<number>`count(*)`,
    })
    .from(ingredients);
  const [nameCount] = await db
    .select({ value: sql<number>`count(*)` })
    .from(ingredientNames);
  const [aliasCount] = await db
    .select({ value: sql<number>`count(*)` })
    .from(ingredientAliases);

  console.log(
    JSON.stringify(
      {
        ingredients: Number(counts?.ingredientCount ?? 0),
        names: Number(nameCount?.value ?? 0),
        aliases: Number(aliasCount?.value ?? 0),
        recipeIngredientLinks: await countLinked("recipe_ingredients"),
        pantryLinks: await countLinked("pantry_items"),
        shoppingListLinks: await countLinked("shopping_list_items"),
        restockLinks: await countLinked("pantry_restock_items"),
      },
      null,
      2,
    ),
  );
}

async function countLinked(table: string): Promise<number> {
  const result = await db.execute<{ value: number }>(
    sql`SELECT count(*)::int AS value FROM ${sql.identifier(table)} WHERE ingredient_id IS NOT NULL`,
  );
  return Number(result.rows?.[0]?.value ?? 0);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
