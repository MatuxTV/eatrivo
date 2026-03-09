# Normalized Recipe JSON Rules

This document defines the upstream contract for any language model that prepares recipe JSON for import into Eatrivo.

Goal: produce recipe files that are already normalized into the canonical multilingual import shape so the application only needs to validate and persist them.

## Required top-level shape

The output file must be valid JSON with exactly this top-level shape:

```json
{
  "recipes": []
}
```

No other top-level keys are allowed.

## Required recipe shape

Each recipe object must use exactly these keys:

```json
{
  "external_key": "string",
  "default_locale": "string",
  "category_key": "string",
  "diet_tags": ["string"],
  "restriction_flags": ["string"],
  "servings": 1,
  "prep_time_min": 0,
  "total_time_min": 0,
  "nutrition_per_serving": {
    "calories": 0,
    "protein_g": 0,
    "carbohydrates_g": 0,
    "fat_g": 0
  },
  "ingredients": [
    {
      "ingredient_key": "string or null",
      "quantity": 0,
      "unit": "string or null",
      "optional": false,
      "sort_order": 0,
      "translations": {
        "en": {
          "display_name": "string",
          "ingredient_name": "string or null"
        }
      }
    }
  ],
  "translations": {
    "en": {
      "name": "string",
      "category_label": "string or null",
      "serving_unit_label": "string or null",
      "instructions": ["string"],
      "notes": "string or null"
    }
  },
  "meal_prep_friendly": false
}
```

No extra recipe keys are allowed.

## Canonical field rules

### Recipe metadata

- `external_key`: required stable locale-neutral recipe identifier. Must not depend on translated labels.
- `default_locale`: required locale that acts as fallback for legacy fields and UI fallback.
- `category_key`: required locale-neutral category identifier such as `breakfast`, `lunch`, `dinner`, `snack`, `pre-workout-fuel`.
- `diet_tags`: required array of locale-neutral suitability tags. Use stable kebab-case keys such as `vegan`, `vegetarian`, `pescatarian`, `paleo`, `gluten-free`, `dairy-free`, `high-protein`.
- `restriction_flags`: required array of locale-neutral presence or caution flags such as `contains-dairy`, `contains-eggs`, `contains-fish`, `contains-shellfish`, `contains-peanuts`, `contains-soy`.
- `servings`: required positive integer.
- `prep_time_min`: required integer number of minutes.
- `total_time_min`: required integer number of minutes.
- `meal_prep_friendly`: required boolean.

Rules:
- Both arrays must always be present, even when empty.
- Use lowercase kebab-case identifiers only.
- Keep them locale-neutral; translated labels belong in UI dictionaries, not recipe JSON.
- `diet_tags` should express what the recipe is suitable for.
- `restriction_flags` should express what the recipe contains or what users may need to avoid.

### Nutrition

- `nutrition_per_serving` must always exist.
- All nutrition values must be numeric.
- Use per-serving values only.
- If a value is unknown, infer only if clearly derivable; otherwise reject the recipe instead of inventing unreliable numbers.

### Recipe translations

- `translations` must always exist and contain at least one locale.
- The `default_locale` must exist inside `translations`.
- Each locale translation object must contain:
  - `name`
  - `instructions`
  - `notes`
  - `serving_unit_label`
  - `category_label`

### Instructions

- `instructions` must be an ordered array of clear step strings.
- Do not include numbering inside the strings if the order is already represented by the array.
- Remove marketing text, tips, and nutrition commentary from instructions.

## Ingredient object rules

Each ingredient must already be structured. Raw ingredient strings are not allowed in the final JSON.

### Required ingredient fields

- `ingredient_key`: normalized machine key used for matching.
- `quantity`: numeric value or `null`.
- `unit`: canonical unit string or `null`.
- `optional`: required boolean.
- `sort_order`: required zero-based integer preserving ingredient order.
- `translations`: required locale map for user-facing ingredient text.

### Ingredient translations

Each ingredient translation must contain:
- `display_name`
- `ingredient_name`

Use a concise UI-friendly ingredient string.

Examples:
- `1 cup Greek yogurt`
- `2 cloves garlic, minced`
- `olive oil, for pan`

Do not include unrelated commentary, nutrition notes, or source annotations.

### `ingredient_name`

This is the normalized semantic ingredient identity.

Rules:
- Remove leading quantity.
- Remove leading unit.
- Remove packaging-only detail when it does not change the ingredient identity.
- Remove preparation notes when they are not part of identity.
- Remove optional serving notes such as `to serve`, `for garnish`, `to taste`.
- Remove leading descriptors like `fresh`, `frozen`, `plain`, `non-fat`, `low-fat`, `large`, `small`, `extra virgin`, `cooked`, `canned`, `unsweetened` when they are not essential to pantry matching.
- Keep the core ingredient identity only.
- Use lowercase sentence text, not slug format.
- Singularize when natural.

Examples:
- `2 cloves garlic, minced` -> `garlic`
- `1 cup fresh tomatoes` -> `tomato`
- `1 tbsp extra virgin olive oil` -> `olive oil`
- `30 oz black beans, canned, no salt added` -> `black bean`

### `ingredient_key`

This is the canonical machine key used by deterministic matching.

Rules:
- Generate from the canonical ingredient identity, not from a locale-specific label with extra noise.
- Lowercase only.
- Remove diacritics.
- Convert spaces and separators to single hyphens.
- Remove all characters except `a-z`, `0-9`, and `-`.
- Collapse repeated hyphens.
- Singularize nouns before slugifying.
- If a reliable identity cannot be determined, use `null` and flag the recipe for review.

Examples:
- `garlic` -> `garlic`
- `olive oil` -> `olive-oil`
- `chicken breast` -> `chicken-breast`
- `black bean` -> `black-bean`

### `quantity`

Rules:
- Must be a JSON number, not a string.
- Use `null` if quantity is genuinely missing or not meaningful.
- Convert unicode fractions to decimal numbers.
- Convert mixed fractions to decimal numbers.

Examples:
- `1/2` -> `0.5`
- `1 1/2` -> `1.5`
- `2` -> `2`

### `unit`

Use canonical normalized units only.

Allowed canonical values are only:
- `g`
- `kg`
- `dl`
- `ml`
- `tsp`
- `ks`

If no meaningful unit exists, use `null`.

Count-like food words such as `clove`, `slice`, `piece`, `fillet`, `leaf`, `head`, `can`, `bottle` must be normalized to `ks` when the ingredient is best represented as a count.

If the source recipe uses any other unit system, convert it approximately into the allowed canonical values instead of preserving the original unit.

Examples of expected conversions:
- `1 cup milk` -> approximate to `2.4 dl` or `240 ml`
- `1 tbsp olive oil` -> approximate to `1.5 tsp` or `15 ml`
- `1 l broth` -> `10 dl` or `1000 ml`
- `12 oz chicken breast` -> approximate to `340 g`
- `2 lbs potatoes` -> approximate to `0.9 kg` or `900 g`
- `1 can tomatoes` -> estimate a practical pantry quantity such as `400 g` only if the source item clearly corresponds to a common packaged amount; otherwise use `null`

Rules:
- Never output units outside this set: `g`, `kg`, `ml`, `dl`, `tsp`, `ks`.
- Prefer `g` over `kg` for smaller amounts and `ml` over `dl` for small liquid amounts when that improves clarity.
- Use approximate conversion when necessary, but keep the value realistic and conservative.
- If the source amount cannot be converted with reasonable confidence, use `quantity: null` and `unit: null` instead of preserving a non-canonical unit.

### `optional`

Set to `true` only when the source explicitly indicates optionality or garnish-only usage.

Treat phrases like these as optional signals:
- `optional`
- `to taste`
- `to serve`
- `for garnish`
- `for serving`

### `sort_order`

- Must start at `0`.
- Must increase by `1` in the exact ingredient display order.
- No duplicates or gaps.

## Normalization policy

The upstream model must prefer deterministic normalization over preserving noisy source wording.

Apply these transformations consistently:

1. Convert unicode fractions to numeric decimals.
2. Remove redundant whitespace.
3. Normalize unit aliases to canonical units.
4. Convert any non-canonical unit approximately into one of: `g`, `kg`, `ml`, `dl`, `tsp`, `ks`.
5. Strip quantity and unit before deriving identity.
6. Strip non-identity descriptors and prep notes before deriving identity.
7. Singularize ingredient identity before building the key.
8. Slugify `ingredient_key` from the cleaned `ingredient_name`.
9. Generate locale translations from the same canonical ingredient and recipe identity.

## Forbidden output patterns

Do not output:

- top-level metadata like `source`, `website`, `subtitle`, `program`, `tags`, `micronutrients`
- nested category wrappers
- `ingredients` as plain strings
- numeric values encoded as strings
- any unit outside `g`, `kg`, `ml`, `dl`, `tsp`, `ks`
- mixed unit conventions inside one file without normalization and approximate conversion
- duplicate recipe keys with different casing conventions
- inferred data that is clearly speculative

## Validation checklist for the upstream model

Before returning the final JSON, verify all of the following:

1. The file is valid JSON.
2. The only top-level key is `recipes`.
3. Every recipe has all required fields.
4. Every recipe has `external_key`, `default_locale`, `category_key`, and `translations`.
5. Every ingredient is an object, not a string.
6. Every ingredient has `ingredient_key`, `quantity`, `unit`, `optional`, `sort_order`, and `translations`.
7. The `default_locale` exists inside each recipe `translations` map.
8. Each ingredient translation map contains the locales needed by the recipe.
9. `sort_order` is continuous from `0`.
10. `ingredient_key` values are lowercase slug strings or `null`.
11. Quantities are numbers or `null`, never strings.
12. Every non-null `unit` is one of `g`, `kg`, `ml`, `dl`, `tsp`, or `ks`.
13. Any source units outside the allowed set were approximately converted or replaced with `null` when confidence was too low.
14. Optional garnish-style ingredients are marked with `optional: true`.
15. No extra metadata keys remain from the source dataset.

## Output contract for the upstream model

When asked to normalize cookbook data for Eatrivo, the model should return only the final JSON payload unless the caller explicitly requests analysis.

If a recipe cannot be normalized confidently, the model should omit that recipe and report it separately rather than invent unstable ingredient identities.