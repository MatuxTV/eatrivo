import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface IngredientTranslation {
  display_name: string;
  ingredient_name: string | null;
}

interface RecipeTranslation {
  name: string;
  category_label: string | null;
  serving_unit_label: string | null;
  instructions: string[];
  notes: string | null;
}

interface CanonicalIngredient {
  ingredient_key: string | null;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  sort_order: number;
  translations: Record<string, IngredientTranslation>;
}

interface CanonicalRecipe {
  external_key: string;
  default_locale: string;
  category_key: string;
  servings: number;
  prep_time_min: number;
  total_time_min: number;
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  };
  ingredients: CanonicalIngredient[];
  translations: Record<string, RecipeTranslation>;
  meal_prep_friendly: boolean;
}

interface CanonicalRecipeFile {
  recipes: CanonicalRecipe[];
}

interface TranslationApiResponse {
  responseData?: {
    translatedText?: string;
  };
}

const TITLE_TRANSLATIONS: Record<string, string> = {
  "Egg Muffins with Tomato, Basil and Spinach": "Vaječné muffiny s paradajkami, bazalkou a špenátom",
  "Spicy Matador Breakfast Burrito": "Pikantné raňajkové burrito Matador",
  "Honey-Yogurt and Oats": "Jogurt s medom a ovsenými vločkami",
  "Almond Butter and Banana Triangles": "Trojuholníky s mandľovým maslom a banánom",
  "Peanut Butter Energy Bites": "Energetické guličky s arašidovým maslom",
  "Pomegranate + Pistachio No-Bake Granola Bars": "Nepečené granola tyčinky s granátovým jablkom a pistáciami",
  "Recovery Smoothie": "Regeneračné smoothie",
  "Herbed Greek Yogurt Chicken Salad": "Kurací šalát s gréckym jogurtom a bylinkami",
  "Quick Pesto Chicken": "Rýchle kuracie s pestom",
  "Protein + Veggie Stuffed Bell Peppers": "Plnené papriky s proteínom a zeleninou",
  "Spanish Zucchini Tortilla": "Španielska cuketová tortilla",
  "Omelet Wraps": "Omeletové wrapy",
  "Egg & Turkey Stuffed Peppers": "Plnené papriky s vajíčkom a morčacím mäsom",
  "Smoked Salmon, Feta & Asparagus Omelet": "Omeleta s údeným lososom, fetou a špargľou",
  "High Protein Blueberry Pancakes": "Vysokoproteínové čučoriedkové lievance",
  "Eggs Fried on Tomatoes with Tuna": "Vajcia na paradajkách s tuniakom",
  "Summer Smoothie Protein Bowl": "Letná proteínová smoothie miska",
  "Spinach Shakshuka": "Špenátová shakshuka",
  "Salmon Tatar with Avocado and Mango": "Tatarák z lososa s avokádom a mangom",
  "Tuna Salad Lettuce Wraps": "Šalátové wrapy s tuniakom v listoch šalátu",
  "Chicken, Orange and Walnut Salad": "Kurací šalát s pomarančom a vlašskými orechmi",
  "Salmon & Peach Salad": "Šalát s lososom a broskyňou",
  "Tuna & Broccoli Salad with Honey Vinaigrette": "Tuniakový a brokolicový šalát s medovou vinaigrette",
  "Grilled Chicken & Pineapple Salad": "Šalát s grilovaným kuracím mäsom a ananásom",
  "Waldorf Chicken Salad": "Waldorfský kurací šalát",
  "Tuna & Quinoa Toss Salad": "Premiešaný šalát s tuniakom a quinoou",
  "Salmon & Couscous Salad": "Šalát s lososom a kuskusom",
  "Post-Workout Potato Pancakes with Cottage Cheese": "Potréningové zemiakové placky s cottage cheese",
  "Miso Salmon with Zucchini Noodles": "Losos s misom a cuketovými rezancami",
  "Moroccan Cod & Bulgur Salad": "Marocký šalát s treskou a bulgurom",
  "Turkey & Broccoli Stir Fry": "Stir-fry z morčacieho mäsa a brokolice",
  "Baked Salmon with Zoodles & Quinoa": "Pečený losos s cuketovými rezancami a quinoou",
  "Chicken Thighs with Hoisin Rice": "Kuracie stehná s hoisin ryžou",
  "Chinese Pork Stir-Fry with Pineapple": "Čínske bravčové stir-fry s ananásom",
  "Slow Cooker Chicken Fajitas": "Kuracie fajitas z pomalého hrnca",
  "Creamy Chicken, Mushroom & Tomato Pasta": "Krémové cestoviny s kuracím mäsom, hubami a paradajkami",
  "Cajun Beef & Veg Rice": "Cajun ryža s hovädzím mäsom a zeleninou",
  "Chinese Style Shrimps & Veg": "Krevety so zeleninou na čínsky spôsob",
  "Zesty Turkey Meatballs with Couscous Salad": "Pikantné morčacie guľky s kuskusovým šalátom",
  "Honey & Lime Glazed Salmon with Pineapple Rice": "Losos s medovo-limetkovou glazúrou a ananásovou ryžou",
  "Simple Chicken Curry with Saffron Rice": "Jednoduché kuracie kari so šafranovou ryžou",
  "One Pot Turkey Chili with Rice": "Morčacie chilli s ryžou z jedného hrnca",
  "Baked Salmon Tray with Rice & Tomatoes": "Pečený losos na plechu s ryžou a paradajkami",
  "Mexican Fried Rice": "Mexická vyprážaná ryža",
  "Beef & Green Beans Pasta in Soy Sauce": "Cestoviny s hovädzím mäsom a zelenými fazuľkami v sójovej omáčke",
  "Chicken & Mango Stir Fry": "Kuracie stir-fry s mangom",
  "Salmon Teriyaki with Green Beans & Sweetcorn Rice": "Teriyaki losos so zelenými fazuľkami a ryžou so sladkou kukuricou",
  "Chicken Orange Stir Fry": "Kuracie stir-fry s pomarančom",
  "Pesto Pasta with Tuna & Almonds": "Cestoviny s pestom, tuniakom a mandľami",
  "Sweet and Sour Pork Stir-Fry": "Sladkokyslé bravčové stir-fry",
  "Pepper Steak": "Hovädzí steak s paprikou",
  "Quick & Easy Meatballs": "Rýchle a jednoduché mäsové guľky",
  "Quick Beef Chow Mein": "Rýchly hovädzí chow mein",
  "Simple Chili & Sweet Potato Chips": "Jednoduché chilli so sladkozemiakovými hranolkami",
  "Cherry Sorbet": "Čerešňový sorbet",
  "Protein Fruit Bowls": "Proteínové ovocné misky",
  "Matcha Chia Pudding": "Matcha chia puding",
  "Raspberry Protein Smoothie": "Malinové proteínové smoothie",
  "Green Glow Protein Smoothie": "Zelené proteínové smoothie",
  "Vanilla & Coffee Protein Smoothie": "Vanilkovo-kávové proteínové smoothie",
  "Antioxidant Blueberry Protein Smoothie": "Antioxidačné čučoriedkové proteínové smoothie",
  "Cinnamon Roll Protein Smoothie": "Proteínové smoothie so škoricou",
};

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  breakfast: "Raňajky",
  lunch: "Obed",
  dinner: "Večera",
  "lunch-and-dinner": "Obed a večera",
  "pre-workout-fuel": "Predtréningové jedlo",
  "post-workout-fuel": "Potréningové jedlo",
  smoothies: "Smoothie",
  treats: "Maškrty",
};

const TEXT_OVERRIDES: Record<string, string> = {
  muffins: "muffiny",
  wraps: "wrapy",
  bars: "tyčinky",
  bowls: "misky",
  bowl: "miska",
  glasses: "poháre",
  glass: "pohár",
  pancakes: "lievance",
  peppers: "papriky",
  tortillas: "tortilly",
  "lettuce leaves": "listy šalátu",
  "cottage cheese": "cottage cheese",
  zoodles: "cuketové rezance",
};

const POST_TRANSLATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/350°F/gi, "175°C"],
  [/375°F/gi, "190°C"],
  [/400°F/gi, "200°C"],
  [/410°F/gi, "210°C"],
  [/420°F/gi, "215°C"],
  [/450°F/gi, "230°C"],
  [/480°F/gi, "250°C"],
  [/165°F/gi, "74°C"],
  [/Mafiny/gi, "muffiny"],
  [/Na pokrytie panvice/gi, "na potretie panvice"],
  [/olivový olej alebo rastlinný sprej \(na potretie panvice\)/gi, "olivový olej alebo rastlinný sprej na potretie panvice"],
  [/vysoko rýchlostnom mixéri/gi, "výkonnom mixéri"],
  [/cottage syr/gi, "cottage cheese"],
  [/\s+\./g, "."],
  [/\s+,/g, ","],
  [/\s+:/g, ":"],
  [/\(\s+/g, "("],
  [/\s+\)/g, ")"],
  [/\s{2,}/g, " "],
];

function normalizeSpacing(value: string): string {
  let normalized = value.trim();
  for (const [pattern, replacement] of POST_TRANSLATION_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.trim();
}

async function translateViaApi(text: string, cache: Map<string, string>): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }

  const override = TEXT_OVERRIDES[trimmed];
  if (override) {
    return override;
  }

  const cached = cache.get(trimmed);
  if (cached) {
    return cached;
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|sk`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "eatrivo-recipe-localizer/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Translation request failed for \"${trimmed}\": ${response.status}`);
  }

  const data = (await response.json()) as TranslationApiResponse;
  const translated = data.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error(`Translation response missing translatedText for \"${trimmed}\".`);
  }

  const normalized = normalizeSpacing(translated);
  cache.set(trimmed, normalized);
  return normalized;
}

async function translateOptional(value: string | null, cache: Map<string, string>): Promise<string | null> {
  if (!value) {
    return null;
  }
  return translateViaApi(value, cache);
}

async function translateIngredientTranslation(
  translation: IngredientTranslation,
  cache: Map<string, string>,
): Promise<IngredientTranslation> {
  return {
    display_name: await translateViaApi(translation.display_name, cache),
    ingredient_name: await translateOptional(translation.ingredient_name, cache),
  };
}

async function translateRecipeTranslation(
  recipe: CanonicalRecipe,
  cache: Map<string, string>,
): Promise<RecipeTranslation> {
  const en = recipe.translations.en;

  return {
    name: TITLE_TRANSLATIONS[en.name] ?? (await translateViaApi(en.name, cache)),
    category_label: CATEGORY_TRANSLATIONS[recipe.category_key] ?? (await translateOptional(en.category_label, cache)),
    serving_unit_label: await translateOptional(en.serving_unit_label, cache),
    instructions: await Promise.all(en.instructions.map((instruction) => translateViaApi(instruction, cache))),
    notes: await translateOptional(en.notes, cache),
  };
}

async function enrichFile(filePath: string, cache: Map<string, string>): Promise<void> {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as CanonicalRecipeFile;

  const localizedRecipes: CanonicalRecipe[] = [];
  for (const recipe of raw.recipes) {
    const localizedIngredients: CanonicalIngredient[] = [];
    for (const ingredient of recipe.ingredients) {
      localizedIngredients.push({
        ...ingredient,
        translations: {
          ...ingredient.translations,
          sk: await translateIngredientTranslation(ingredient.translations.en, cache),
        },
      });
    }

    localizedRecipes.push({
      ...recipe,
      ingredients: localizedIngredients,
      translations: {
        ...recipe.translations,
        sk: await translateRecipeTranslation(recipe, cache),
      },
    });
  }

  writeFileSync(filePath, `${JSON.stringify({ recipes: localizedRecipes }, null, 2)}\n`, "utf8");
  console.log(`Added sk translations to ${filePath} (${localizedRecipes.length} recipes)`);
}

async function main(): Promise<void> {
  const filePaths = [
    resolve("receipes/athlete-cookbook.json"),
    resolve("receipes/rzone-high-protein-recipes.json"),
  ];
  const cache = new Map<string, string>();

  for (const filePath of filePaths) {
    await enrichFile(filePath, cache);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});