# Normalized Recipe JSON Rules

This document defines the canonical upstream contract for any language model or normalization pipeline that prepares recipe JSON for import into Eatrivo.

**Goal:** produce recipe files that are already normalized into the canonical multilingual product shape so the application only needs to validate and persist them.

The importer now enforces this canonical multilingual shape strictly. Legacy english-only recipe payloads and flat ingredient payloads are no longer accepted.

This document is intentionally stricter than legacy importer compatibility. Where a temporary compatibility alias is still needed by existing tooling, that alias is called out explicitly as transitional and must not be treated as the semantic source of truth.

---

## Required top-level shape

The output file must be valid JSON with exactly this top-level shape:

```json
{
  "recipes": [],
  "rejected": []
}
```

If a recipe cannot be normalized confidently, append an object to the `rejected` array containing the `"external_key"` and a short `"reason"` instead of inventing unreliable data. No other top-level keys are allowed.

`rejected` is an upstream workflow artifact for normalization QA. Runtime importers may only consume `recipes`, but the canonical upstream contract still includes `rejected` so failed normalizations remain explicit and auditable.

---

## Required recipe shape

Each recipe object inside the `recipes` array must use exactly these recipe-level keys:

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
      "ingredient_specific_key": "string or null",
      "canonical_name": "string or null",
      "quantity": 0,
      "unit": "string or null",
      "optional": false,
      "sort_order": 0,
      "translations": {
        "en": {
          "display_name": "string"
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

No extra recipe-level keys are allowed.

---

## Canonical field rules

### Recipe metadata

- **`external_key`** — required stable locale-neutral recipe identifier. Must not depend on translated labels.
- **`default_locale`** — required locale that acts as fallback for legacy fields and UI fallback.
- **`category_key`** — required locale-neutral category identifier such as `breakfast`, `lunch`, `dinner`, `snack`, `pre-workout-fuel`.
- **`diet_tags`** — required array of locale-neutral suitability tags. Use stable kebab-case keys such as `vegan`, `vegetarian`, `pescatarian`, `paleo`, `gluten-free`, `dairy-free`, `high-protein`.
- **`restriction_flags`** — required array of locale-neutral presence or caution flags such as `contains-dairy`, `contains-eggs`, `contains-fish`, `contains-shellfish`, `contains-peanuts`, `contains-soy`.
- **`servings`** — required positive integer.
- **`prep_time_min`** — required integer number of minutes.
- **`total_time_min`** — required integer number of minutes.
- **`meal_prep_friendly`** — required boolean.

**Rules:**

- Both arrays must always be present, even when empty.
- Use lowercase kebab-case identifiers only.
- Keep them locale-neutral; translated labels belong in UI dictionaries, not recipe JSON.
- `diet_tags` should express what the recipe is suitable for.
- `restriction_flags` should express what the recipe contains or what users may need to avoid.
- `servings` must represent realistic portions for a reference eater defined as an average adult male weighing 70 kg and measuring 175 cm.
- If the source serving count is missing, ambiguous, or clearly inflated/undersized, normalize it to the number of realistic meal portions for that reference eater instead of copying the source blindly.
- One serving must mean one full eating occasion for that reference eater, not a tasting portion, garnish portion, or family-style share estimate.

### `meal_prep_friendly` criteria

Set `meal_prep_friendly: true` only when **all** of the following conditions are met:

- The recipe stores well for at least 3 days refrigerated without significant quality loss (texture, taste, safety).
- It can be fully prepared in advance and reheated or served cold without additional active cooking steps.
- It does not rely on ingredients that degrade quickly after preparation, such as cut avocado, dressed leafy salads, or fried coatings that turn soggy.

Set `meal_prep_friendly: false` when any of the following apply:

- The recipe contains components that must be served immediately (e.g. soufflés, fresh whipped cream, poached eggs).
- The recipe includes ingredients that brown, wilt, or separate within 24 hours under refrigeration.
- The source explicitly states "serve immediately" or equivalent.

When the source does not provide enough information to decide confidently, default to `false`.

---

## Portion normalization baseline

Use this fixed reference person for portion normalization:

| Property | Value |
|----------|-------|
| Sex | male |
| Body weight | 70 kg |
| Height | 175 cm |

**Interpretation rules:**

- Treat `servings` as the count of realistic portions for that reference person.
- Normalize the entire recipe so that `nutrition_per_serving` reflects one portion for that reference person.
- If the source recipe is written for a household or tray and the stated servings look unrealistic, rescale to realistic single-meal portions before calculating per-serving nutrition.
- If the source recipe already provides believable serving information, keep it.
- If no serving information exists, infer it conservatively from ingredient mass, meal type, and total dish yield.

**Heuristic portion targets for the reference person:**

| Category | kcal per serving |
|----------|-----------------|
| Breakfast | ~350–550 kcal |
| Lunch or dinner | ~500–850 kcal |
| Snack | ~150–350 kcal |
| Pre-workout fuel | ~250–450 kcal |

> These ranges are normalization heuristics only. They are not medical guidance, but they should anchor the upstream model to realistic portion sizes.

---

## Category-specific portion policy

When `category_key` is more specific than the generic meal buckets above, prefer these heuristics:

| Category | Heuristic |
|----------|-----------|
| `smoothies` | 250–450 kcal per serving. Treat one tall glass or one shaker bottle as one serving unless the source clearly describes a multi-serving batch. |
| `salad` | 300–650 kcal per serving for a main-meal salad. If clearly a side salad, either classify it differently or use smaller servings consistently. |
| `dessert` | 180–420 kcal per serving. Use dessert-sized portions, not main-meal portions. |
| `post-workout` | 300–550 kcal per serving, often with relatively higher protein than a generic snack. |
| `pre-workout-fuel` | 250–450 kcal per serving, typically lighter and easier to digest than lunch or dinner. |
| `breakfast` | 350–550 kcal per serving. |
| `lunch` | 500–800 kcal per serving. |
| `dinner` | 550–850 kcal per serving. |
| `snack` | 150–350 kcal per serving. |
| `soup` | 250–500 kcal per serving for a meal soup. If clearly a starter soup, use smaller portions. |
| `spread`, `dip`, or `sauce` | Do not force a full-meal serving. Use realistic condiment or accompaniment portions and ensure nutrition stays per actual serving. |

**Interpretation rules:**

- Prefer realistic eating-context portions over source website claims like "serves 8" when the ingredient mass clearly supports only 2–4 main portions.
- For blended drinks, porridges, bowls, and plated single-meal recipes, assume one serving should correspond to one typical individual container or plate for the reference person.
- For tray bakes, casseroles, curries, pasta dishes, and rice dishes, estimate servings from total yield and meal context, then compute `nutrition_per_serving` from that normalized portion count.
- For desserts and sauces, keep portions smaller even if the total batch calories are high.
- If the category and source wording conflict, prefer the actual dish format and meal context over the raw category label.

---

## Nutrition

- `nutrition_per_serving` must always exist.
- All nutrition values must be numeric.
- Use per-serving values only.
- `nutrition_per_serving` must be calculated from the normalized `servings` value, not from an unverified source portion label.
- Per-serving nutrition must correspond to one realistic portion for the reference eater: male, 70 kg, 175 cm.
- If a value is unknown, infer only if clearly derivable; otherwise reject the recipe instead of inventing unreliable numbers.

### Caloric consistency check

Before finalizing a recipe, verify that the stated `calories` in `nutrition_per_serving` is consistent with the summed macronutrient values using the standard energy coefficients:

- protein: 4 kcal/g
- carbohydrates: 4 kcal/g
- fat: 9 kcal/g

**Tolerance: ±15 %** relative to the macro-derived calorie sum.

If the deviation exceeds ±15 %, apply this resolution order:

1. Recalculate `calories` from the macros and use that value.
2. If the macros themselves look unreliable, attempt to re-derive them from the ingredient list.
3. If neither can be resolved with confidence, reject the recipe and append it to `rejected` with the reason `"nutrition_inconsistency"`.

Do not silently preserve a calories value that contradicts the macros.

---

## Recipe translations

- `translations` must always exist and contain at least one locale.
- The `default_locale` must exist inside `translations`.
- Each locale translation object must contain: `name`, `instructions`, `notes`, `serving_unit_label`, `category_label`.

### Instructions

- `instructions` must be an ordered array of clear step strings.
- Do not include numbering inside the strings if the order is already represented by the array.
- Remove marketing text, tips, and nutrition commentary from instructions.

### Temperature normalization in instructions

All temperatures mentioned in instruction strings must be expressed in **°C only**.

If the source recipe uses Fahrenheit, convert to Celsius and round to the nearest 5 °C for oven temperatures, or to the nearest whole degree for other uses.

**Common reference conversions:**

| Source (°F) | Canonical (°C) |
|-------------|----------------|
| 325 °F | 160 °C |
| 350 °F | 175 °C |
| 375 °F | 190 °C |
| 400 °F | 200 °C |
| 425 °F | 220 °C |
| 450 °F | 230 °C |

Use the formula `°C = (°F − 32) × 5/9` for values not in the table. Never output a Fahrenheit value in the final JSON.

---

## Ingredient object rules

Each ingredient must already be structured. Raw ingredient strings are not allowed in the final JSON.

### Required ingredient fields

| Field | Description |
|-------|-------------|
| `ingredient_key` | Normalized machine key used for matching. |
| `ingredient_specific_key` | More specific machine key for exact pantry variant matching. |
| `canonical_name` | Normalized semantic ingredient identity (locale-neutral). |
| `quantity` | Numeric value or `null`. |
| `unit` | Canonical unit string or `null`. |
| `optional` | Required boolean. |
| `sort_order` | Required zero-based integer preserving ingredient order. |
| `translations` | Required locale map for user-facing ingredient text. |

### Ingredient translations

Each ingredient translation must contain `display_name`. Use a concise UI-friendly localized ingredient label in the target language.

Do not include unrelated commentary, nutrition notes, or source annotations.

### Localized label contract for `display_name`

The `unit` field always stores the **canonical machine value** (`tbsp`, `tsp`, `g`, `kg`, `ml`, `dl`, `pc`). It is locale-neutral and must never be translated.

The `display_name` inside each locale translation is the **localized ingredient label only**. It must not contain the quantity, unit label, or parenthetical gloss. Quantity and unit already exist in structured fields and must be rendered separately by the application when needed.

When the source phrase is declined because of quantity or grammar, normalize it back to the locale-appropriate base form before writing `display_name`.

For Slovak, this means the label should be in the natural base/nominative ingredient form, not a quantity-driven inflected form.

**Examples of required normalization for `display_name`:**

| Source localized phrase | Required `display_name` |
|-------------------------|-------------------------|
| `40 g čedaru (mozzarella cheese)` | `čedar` |
| `2 malé tortilly` | `tortilla` |
| `100 g vareného kuracieho mäsa` | `kuracie mäso` |
| `3 vajcia` | `vajce` |

If a descriptor is not part of the ingredient identity, remove it from `display_name` just as you would remove it from `canonical_name`. Preparation notes, serving notes, parenthetical English glosses, and quantity-driven inflections do not belong in `display_name`.

If the UI needs a combined string such as `2 pl olivový olej`, it must compose it at render time from:

- `quantity`
- `unit`
- localized `display_name`

The recipe JSON itself must keep these pieces separate.

**Canonical unit → locale label reference for render-time composition:**

| Canonical `unit` | `en` | `sk` | `cs` | `de` | `hu` |
|------------------|------|------|------|------|------|
| `tbsp` | tbsp | pl | lž | EL | ek |
| `tsp` | tsp | kl | lžč | TL | kk |
| `g` | g | g | g | g | g |
| `kg` | kg | kg | kg | kg | kg |
| `ml` | ml | ml | ml | ml | ml |
| `dl` | dl | dl | dl | dl | dl |
| `pc` | pc | ks | ks | Stk | db |

> Abbreviation legend: pl = polievková lyžica, kl = káva/čajová lyžica, lž = lžíce, lžč = lžička, EL = Esslöffel, TL = Teelöffel, ek = evőkanál, kk = kiskanál, ks = kus, Stk = Stück, db = darab.

**Rules:**

- `unit` is always the canonical value from the allowed set. Never put a localized label into `unit`.
- `display_name` must contain only the localized ingredient label, without quantity or unit.
- `display_name` must be normalized to the locale-appropriate base form rather than a quantity-inflected form.
- If a locale is not listed in the table, use the `en` unit label only when composing a combined string at render time.
- `pc` remains a structured machine unit; do not serialize `pc` into `display_name`.

**Examples for localized ingredient labels:**

```json
"translations": {
  "en": { "display_name": "olive oil" },
  "sk": { "display_name": "olivový olej" },
  "cs": { "display_name": "olivový olej" },
  "de": { "display_name": "Olivenöl" },
  "hu": { "display_name": "olívaolaj" }
}
```

**Examples for count-based ingredients:**

```json
"translations": {
  "en": { "display_name": "egg" },
  "sk": { "display_name": "vajce" },
  "cs": { "display_name": "vejce" },
  "de": { "display_name": "Ei" },
  "hu": { "display_name": "tojás" }
}
```

---

### `canonical_name`

This is the normalized semantic ingredient identity, independent of the locale translation.

**Rules:**

- Remove leading quantity.
- Remove leading unit.
- Remove packaging-only detail when it does not change the ingredient identity.
- Remove preparation notes when they are not part of identity.
- Remove optional serving notes such as *to serve*, *for garnish*, *to taste*.
- Remove leading descriptors like *fresh*, *frozen*, *plain*, *non-fat*, *low-fat*, *large*, *small*, *extra virgin*, *cooked*, *canned*, *unsweetened* when they are not essential to pantry matching.
- Keep the core ingredient identity only.
- Use lowercase sentence text, not slug format.
- Singularize when natural.

**Examples:**

| Source | `canonical_name` |
|--------|-----------------|
| `2 cloves garlic, minced` | `garlic` |
| `200 g fresh tomatoes` | `tomato` |
| `1 tbsp extra virgin olive oil` | `olive oil` |
| `800 g black beans, canned, no salt added` | `black bean` |

---

### `ingredient_key`

This is the canonical machine key used by deterministic matching.

**Rules:**

- Generate from the `canonical_name`, not from a locale-specific label with extra noise.
- Lowercase only.
- Remove diacritics.
- Convert spaces and separators to single hyphens.
- Remove all characters except `a-z`, `0-9`, and `-`.
- Collapse repeated hyphens.
- Singularize nouns before slugifying.
- If a reliable identity cannot be determined, use `null` and flag the recipe for review.

**Examples:**

| `canonical_name` | `ingredient_key` |
|-----------------|-----------------|
| `garlic` | `garlic` |
| `olive oil` | `olive-oil` |
| `chicken breast` | `chicken-breast` |
| `black bean` | `black-bean` |

---

### `ingredient_specific_key`

This is the optional exact-variant machine key used for higher-precision pantry matching.

**Rules:**

- Use it when the ingredient identity is confidently more specific than the broader `ingredient_key`.
- It must be equal to or more specific than `ingredient_key`, never broader.
- It must use the same canonical slug style as `ingredient_key`.
- If the exact variant is not confidently known, use `null`.
- If the ingredient is already generic and there is no narrower useful distinction, it may equal `ingredient_key`.

**Examples:**

| `canonical_name` | `ingredient_key` | `ingredient_specific_key` |
|-----------------|------------------|---------------------------|
| `rice` | `rice` | `jasmine-rice` |
| `chicken` | `chicken` | `chicken-breast` |
| `olive oil` | `olive-oil` | `extra-virgin-olive-oil` |
| `egg` | `egg` | `egg` |

---

### `quantity`

**Rules:**

- Must be a JSON number, not a string.
- Use `null` if quantity is genuinely missing or not meaningful.
- Convert unicode fractions to decimal numbers.
- Convert mixed fractions to decimal numbers.

**Examples:**

| Source | Value |
|--------|-------|
| `1/2` | `0.5` |
| `1 1/2` | `1.5` |
| `2` | `2` |

---

### `unit`

Use canonical normalized units only. Allowed canonical values are **only**:

`g` · `kg` · `dl` · `ml` · `tbsp` · `tsp` · `pc`

If no meaningful unit exists, use `null`.

Count-like food words such as *clove*, *slice*, *piece*, *fillet*, *leaf*, *head*, *can*, *bottle* must be normalized to `pc` when the ingredient is best represented as a count.

If the source recipe uses any non-canonical unit (including imperial units such as cups, ounces, pounds, or fluid ounces), convert it approximately into the allowed canonical values instead of preserving the original unit.

**Expected conversions:**

| Source | Canonical |
|--------|-----------|
| `1 cup milk` | `240 ml` |
| `½ cup oats` | `120 ml` or weigh as `~45 g` |
| `1 l broth` | `1000 ml` |
| `12 oz chicken breast` | `~340 g` |
| `2 lbs potatoes` | `~900 g` |
| `1 fl oz liquid` | `~30 ml` |
| `1 can tomatoes` | `400 g` *(if clearly a standard 400 g can; otherwise `null`)* |

**Rules:**

- The canonical unit set is metric-first. Imperial units are never output.
- Never output units outside this set: `g`, `kg`, `ml`, `dl`, `tbsp`, `tsp`, `pc`.
- Prefer `g` over `kg` for smaller amounts and `ml` over `dl` for small liquid amounts when that improves clarity.
- Use approximate conversion when necessary, but keep the value realistic and conservative.
- If the source amount cannot be converted with reasonable confidence, use `quantity: null` and `unit: null` instead of preserving a non-canonical unit.

---

### `optional`

Set to `true` only when the source explicitly indicates optionality or garnish-only usage.

Treat phrases like these as optional signals: `optional`, `to taste`, `to serve`, `for garnish`, `for serving`.

---

### `sort_order`

- Must start at `0`.
- Must increase by `1` in the exact ingredient display order.
- No duplicates or gaps.

---

## Normalization policy

The upstream model must prefer deterministic normalization over preserving noisy source wording.

Apply these transformations consistently:

- Convert unicode fractions to numeric decimals.
- Remove redundant whitespace.
- Normalize unit aliases to canonical units.
- Convert any non-canonical or imperial unit approximately into one of: `g`, `kg`, `ml`, `dl`, `tbsp`, `tsp`, `pc`. Never preserve `cup`, `oz`, `fl oz`, `lb`, or any other non-metric unit in the output.
- Strip quantity and unit before deriving identity.
- Strip non-identity descriptors and prep notes before deriving identity.
- Singularize ingredient identity to populate `canonical_name`.
- Normalize each localized `display_name` to the locale-appropriate base ingredient form with no embedded quantity, unit, or parenthetical gloss.
- Slugify `ingredient_key` from the `canonical_name`.
- Derive `ingredient_specific_key` only when the exact variant is confidently known and useful for pantry matching.
- Generate locale translations from the same canonical ingredient and recipe identity.

## Forbidden output patterns

Do not output:

- Top-level metadata like `source`, `website`, `subtitle`, `program`, `tags`, `micronutrients`
- Nested category wrappers
- Ingredients as plain strings
- Numeric values encoded as strings
- Any unit outside `g`, `kg`, `ml`, `dl`, `tbsp`, `tsp`, `pc`
- Imperial units such as `cup`, `oz`, `fl oz`, `lb`, `inch` — always convert to metric
- Mixed unit conventions inside one file without normalization and approximate conversion
- Duplicate recipe keys with different casing conventions
- Inferred data that is clearly speculative
- Quantities, unit labels, or parenthetical English aliases embedded inside ingredient `display_name`
- Quantity-inflected localized ingredient labels where a base ingredient form can be produced confidently

Do not output internal persistence fields such as `source`, `user_generated`, `created_by_user_id`, or `source_job_id` in upstream normalized JSON. Those are internal system concerns, not upstream content fields.

---

## Validation checklist for the upstream model

Before returning the final JSON, verify all of the following:

- [ ] The file is valid JSON.
- [ ] The only top-level keys are `recipes` and `rejected`.
- [ ] Every recipe inside `recipes` has all required fields.
- [ ] Every recipe has `external_key`, `default_locale`, `category_key`, and `translations`.
- [ ] Every ingredient is an object, not a string.
- [ ] Every ingredient has `ingredient_key`, `ingredient_specific_key`, `canonical_name`, `quantity`, `unit`, `optional`, `sort_order`, and `translations`.
- [ ] The `default_locale` exists inside each recipe `translations` map.
- [ ] Each ingredient `translations` map contains the locales needed by the recipe.
- [ ] Each ingredient translation contains `display_name`.
- [ ] Each `display_name` contains only the localized ingredient label, not the quantity or unit.
- [ ] Each localized `display_name` is normalized to the locale-appropriate base ingredient form.
- [ ] `sort_order` is continuous from `0`.
- [ ] `ingredient_key` values are lowercase slug strings or `null`.
- [ ] `ingredient_specific_key` values are lowercase slug strings or `null`, and never broader than `ingredient_key`.
- [ ] Quantities are numbers or `null`, never strings.
- [ ] Every non-null unit is one of `g`, `kg`, `ml`, `dl`, `tbsp`, `tsp`, or `pc`.
- [ ] Any source units outside the allowed set were approximately converted or replaced with `null` when confidence was too low.
- [ ] Optional garnish-style ingredients are marked with `optional: true`.
- [ ] No extra metadata keys remain from the source dataset.
- [ ] All temperatures in instruction strings are expressed in °C; no Fahrenheit values remain.
- [ ] `unit` fields contain only canonical machine values; localized unit labels are used only when the UI composes a combined display string.
- [ ] `calories` in `nutrition_per_serving` is consistent with the macro sum within ±15 %; if not, it was recalculated or the recipe was rejected.
- [ ] `meal_prep_friendly` was set based on the defined criteria, defaulting to `false` when uncertain.

---

## Output contract for the upstream model

When asked to normalize cookbook data for Eatrivo, the model should return **only the final JSON payload** unless the caller explicitly requests analysis.

If a recipe cannot be normalized confidently, the model should omit that recipe from the `recipes` array and append an error object to the `rejected` array containing the recipe's identifier and the reason for rejection.