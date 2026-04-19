export type PantryTrackingMode = "quantity" | "availability";

interface PantryTrackingInferenceInput {
  name?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
  trackingMode?: PantryTrackingMode | null;
  aiRecommendedTrackingMode?: PantryTrackingMode | null;
  quantity?: number | null;
  unit?: string | null;
}

const STAPLE_KEYS = new Set([
  "oregano",
  "dried-oregano",
  "thyme",
  "rosemary",
  "bay-leaf",
  "bay-leaves",
  "nutmeg",
  "cloves",
  "ground-ginger",
  "coriander-powder",
  "baking-powder",
  "baking-soda",
  "vanilla-extract",
  "vanilla-essence",
  "cornstarch",
  "bbq-sauce",
  "sriracha",
  "oyster-sauce",
  "hoisin-sauce",
  "sweet-chili-sauce",
  "tabasco",
  "honey",
  "maple-syrup",
  "agave-syrup",
  "bouillon",
  "vegetable-bouillon",
  "chicken-bouillon",
  "garlic",
  "salt",
  "sea-salt",
  "kosher-salt",
  "black-pepper",
  "white-pepper",
  "pepper",
  "paprika",
  "smoked-paprika",
  "sweet-paprika",
  "hot-paprika",
  "chili-powder",
  "chili-flakes",
  "cayenne-pepper",
  "turmeric",
  "cumin",
  "ground-cumin",
  "cinnamon",
  "ground-cinnamon",
  "curry-powder",
  "olive-oil",
  "sesame-oil",
  "sunflower-oil",
  "rapeseed-oil",
  "avocado-oil",
  "coconut-oil",
  "canola-oil",
  "oil",
  "soy-sauce",
  "tamari",
  "fish-sauce",
  "hot-sauce",
  "worcestershire-sauce",
  "mustard",
  "ketchup",
  "mayonnaise",
  "vinegar",
  "balsamic-vinegar",
  "apple-cider-vinegar",
  "red-wine-vinegar",
  "white-wine-vinegar",
  "rice-vinegar",
]);

const STAPLE_FAMILY_KEYS = new Set([
  "garlic",
  "salt",
  "pepper",
  "oil",
  "vinegar",
]);

const NON_STAPLE_SPECIFIC_KEYS = new Set([
  "fresh-ginger",
  "ginger-root",
  "fresh-chili",
  "jalapeno",
  "habanero",
  "bell-pepper",
  "red-bell-pepper",
  "green-bell-pepper",
  "yellow-bell-pepper",
  "orange-bell-pepper",
  "fresh-basil",
  "basil",
  "fresh-parsley",
  "parsley",
  "fresh-coriander",
  "cilantro",
  "fresh-mint",
  "mint",
  "fresh-dill",
  "dill",
]);

const STAPLE_PATTERNS = [
  /(^|\b)garlic(\b|$)/i,
  /(^|\b)cesnak(\b|$)/i,
  /(^|\b)salt(\b|$)/i,
  /(^|\b)sol(\b|$)/i,
  /(^|\b)black pepper(\b|$)/i,
  /(^|\b)cierne korenie(\b|$)/i,
  /(^|\b)cierne korenie mlete(\b|$)/i,
  /(^|\b)pepper(\b|$)/i,
  /(^|\b)korenie(\b|$)/i,
  /(^|\b)paprika(\b|$)/i,
  /(^|\b)chilli powder(\b|$)/i,
  /(^|\b)chili powder(\b|$)/i,
  /(^|\b)chilli flakes(\b|$)/i,
  /(^|\b)chili flakes(\b|$)/i,
  /(^|\b)turmeric(\b|$)/i,
  /(^|\b)kurkuma(\b|$)/i,
  /(^|\b)cumin(\b|$)/i,
  /(^|\b)rasca(\b|$)/i,
  /(^|\b)ground cumin(\b|$)/i,
  /(^|\b)cinnamon(\b|$)/i,
  /(^|\b)skorica(\b|$)/i,
  /(^|\b)curry powder(\b|$)/i,
  /(^|\b)kari(\b|$)/i,
  /(^|\b)olive oil(\b|$)/i,
  /(^|\b)olivovy olej(\b|$)/i,
  /(^|\b)olivový olej(\b|$)/i,
  /(^|\b)soy sauce(\b|$)/i,
  /(^|\b)sojova omacka(\b|$)/i,
  /(^|\b)sójová omáčka(\b|$)/i,
  /(^|\b)tamari(\b|$)/i,
  /(^|\b)fish sauce(\b|$)/i,
  /(^|\b)hot sauce(\b|$)/i,
  /(^|\b)worcestershire(\b|$)/i,
  /(^|\b)mustard(\b|$)/i,
  /(^|\b)horcica(\b|$)/i,
  /(^|\b)horčica(\b|$)/i,
  /(^|\b)ketchup(\b|$)/i,
  /(^|\b)kecup(\b|$)/i,
  /(^|\b)kečup(\b|$)/i,
  /(^|\b)mayonnaise(\b|$)/i,
  /(^|\b)majoneza(\b|$)/i,
  /(^|\b)majonéza(\b|$)/i,
  /(^|\b)vinegar(\b|$)/i,
  /(^|\b)ocot(\b|$)/i,
  /(^|\b)oregano(\b|$)/i,
  /(^|\b)thyme(\b|$)/i,
  /(^|\b)tymian(\b|$)/i,
  /(^|\b)rosemary(\b|$)/i,
  /(^|\b)rozmarin(\b|$)/i,
  /(^|\b)bay leaf(\b|$)/i,
  /(^|\b)bay leaves(\b|$)/i,
  /(^|\b)bobkovy list(\b|$)/i,
  /(^|\b)nutmeg(\b|$)/i,
  /(^|\b)muskatovy oriesok(\b|$)/i,
  /(^|\b)cloves(\b|$)/i,
  /(^|\b)klinceky(\b|$)/i,
  /(^|\b)ground ginger(\b|$)/i,
  /(^|\b)mlety zazvor(\b|$)/i,
  /(^|\b)suseny zazvor(\b|$)/i,

  /(^|\b)baking powder(\b|$)/i,
  /(^|\b)kypriaci prasok(\b|$)/i,
  /(^|\b)prasok do peciva(\b|$)/i,
  /(^|\b)baking soda(\b|$)/i,
  /(^|\b)soda bikarbona(\b|$)/i,
  /(^|\b)vanilla extract(\b|$)/i,
  /(^|\b)vanilkovy extrakt(\b|$)/i,
  /(^|\b)cornstarch(\b|$)/i,
  /(^|\b)kukuricny skrob(\b|$)/i,
  /(^|\b)zlaty klas(\b|$)/i,

  /(^|\b)sriracha(\b|$)/i,
  /(^|\b)bbq sauce(\b|$)/i,
  /(^|\b)bbq omacka(\b|$)/i,
  /(^|\b)barbecue omacka(\b|$)/i,
  /(^|\b)oyster sauce(\b|$)/i,
  /(^|\b)ustricova omacka(\b|$)/i,
  /(^|\b)hoisin(\b|$)/i,
  /(^|\b)tabasco(\b|$)/i,

  /(^|\b)honey(\b|$)/i,
  /(^|\b)med(\b|$)/i,
  /(^|\b)maple syrup(\b|$)/i,
  /(^|\b)javorovy sirup(\b|$)/i,
  /(^|\b)bouillon(\b|$)/i,
  /(^|\b)bujon(\b|$)/i,
];

const NON_STAPLE_NAME_PATTERNS = [
  /(^|\b)bell pepper(\b|$)/i,
  /(^|\b)(red|green|yellow|orange) pepper(\b|$)/i,
  /(^|\b)(red|green|yellow|orange) paprika(\b|$)/i,
  /(^|\b)paprika\s+(fresh|cerstva|čerstvá)(\b|$)/i,
  /(^|\b)fresh basil(\b|$)/i,
  /(^|\b)bazalka(\b|$)/i,
  /(^|\b)fresh parsley(\b|$)/i,
  /(^|\b)petrzlen(\b|$)/i,
  /(^|\b)petržlen(\b|$)/i,
  /(^|\b)cilantro(\b|$)/i,
  /(^|\b)coriander leaves(\b|$)/i,
  /(^|\b)fresh mint(\b|$)/i,
  /(^|\b)mata(\b|$)/i,
  /(^|\b)mata pieporna(\b|$)/i,
  /(^|\b)mäta(\b|$)/i,
  /(^|\b)mäta pieporná(\b|$)/i,
  /(^|\b)fresh dill(\b|$)/i,
  /(^|\b)kopor(\b|$)/i,
  /(^|\b)fresh ginger(\b|$)/i,
  /(^|\b)cerstvy zazvor(\b|$)/i,
  /(^|\b)fresh chili(\b|$)/i,
  /(^|\b)cerstve chili(\b|$)/i,
  /(^|\b)cerstve chilli(\b|$)/i,
  /(^|\b)chilli papricka(\b|$)/i,
];

function normalizeLookup(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function hasExplicitQuantitySignal(
  input: PantryTrackingInferenceInput,
): boolean {
  return typeof input.quantity === "number" && Number.isFinite(input.quantity);
}

export function isDefaultAvailabilityStaple(
  input: Omit<PantryTrackingInferenceInput, "trackingMode">,
): boolean {
  const specificKey = normalizeLookup(input.ingredientSpecificKey);
  const ingredientKey = normalizeLookup(input.ingredientKey);
  const normalizedName = normalizeLookup(input.name);

  if (specificKey && NON_STAPLE_SPECIFIC_KEYS.has(specificKey)) {
    return false;
  }

  if (
    normalizedName &&
    matchesAnyPattern(normalizedName, NON_STAPLE_NAME_PATTERNS)
  ) {
    return false;
  }

  if (specificKey && STAPLE_KEYS.has(specificKey)) {
    return true;
  }

  if (ingredientKey && STAPLE_KEYS.has(ingredientKey)) {
    return true;
  }

  if (ingredientKey && STAPLE_FAMILY_KEYS.has(ingredientKey)) {
    return true;
  }

  if (!normalizedName) {
    return false;
  }

  return matchesAnyPattern(normalizedName, STAPLE_PATTERNS);
}

export function isStampedAvailabilityCandidate(
  input: Omit<PantryTrackingInferenceInput, "trackingMode">,
): boolean {
  if (isDefaultAvailabilityStaple(input)) {
    return true;
  }

  return input.aiRecommendedTrackingMode === "availability";
}

export function shouldPreservePantryQuantity(
  input: PantryTrackingInferenceInput,
): boolean {
  if (!hasExplicitQuantitySignal(input)) {
    return false;
  }

  if (input.trackingMode === "quantity") {
    return true;
  }

  return isStampedAvailabilityCandidate(input);
}

export function supportsPantryQuantityMutations(
  input: PantryTrackingInferenceInput,
): boolean {
  if (input.trackingMode === "quantity") {
    return true;
  }

  return shouldPreservePantryQuantity(input);
}

export function resolvePantryTrackingMode(
  input: PantryTrackingInferenceInput,
): PantryTrackingMode {
  if (input.trackingMode) {
    return input.trackingMode;
  }

  if (input.aiRecommendedTrackingMode === "availability") {
    return "availability";
  }

  if (input.aiRecommendedTrackingMode === "quantity") {
    return "quantity";
  }

  if (isDefaultAvailabilityStaple(input)) {
    return "availability";
  }

  if (hasExplicitQuantitySignal(input)) {
    return "quantity";
  }

  return "quantity";
}
