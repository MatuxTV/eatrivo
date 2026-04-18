import { sql, type SQL } from "drizzle-orm";

import { recipes } from "@/db/schema";

type DietPreference =
  | "none"
  | "lactosefree"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "ketogenic"
  | "paleolithic"
  | null
  | undefined;

function jsonArrayContains(column: typeof recipes.dietTags, value: string): SQL {
  return sql`${column} @> ${JSON.stringify([value])}::jsonb`;
}

export function getDietFilterCondition(
  dietPreference: DietPreference,
): SQL | undefined {
  switch (dietPreference) {
    case "none":
    case null:
    case undefined:
      return undefined;
    case "lactosefree":
      return sql`(
        ${jsonArrayContains(recipes.dietTags, "dairy-free")}
        OR NOT (${recipes.restrictionFlags} @> ${JSON.stringify(["contains-dairy"])}::jsonb)
      )`;
    case "vegetarian":
      return sql`(
        ${jsonArrayContains(recipes.dietTags, "vegetarian")}
        OR ${jsonArrayContains(recipes.dietTags, "vegan")}
      )`;
    case "vegan":
      return jsonArrayContains(recipes.dietTags, "vegan");
    case "pescatarian":
      return jsonArrayContains(recipes.dietTags, "pescatarian");
    case "ketogenic":
      return sql`(
        ${jsonArrayContains(recipes.dietTags, "keto")}
        OR ${jsonArrayContains(recipes.dietTags, "ketogenic")}
        OR ${jsonArrayContains(recipes.dietTags, "low-carb")}
      )`;
    case "paleolithic":
      return sql`(
        ${jsonArrayContains(recipes.dietTags, "paleo")}
        OR ${jsonArrayContains(recipes.dietTags, "paleolithic")}
      )`;
    default:
      return undefined;
  }
}
