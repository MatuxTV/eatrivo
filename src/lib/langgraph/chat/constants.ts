export const NUTRITION_KEYWORDS = [
  "kalóri",
  "jedl",
  "jedál",
  "diét",
  "proteín",
  "bielkovin",
  "tuk",
  "sacharid",
  "makr",
  "vymeni",
  "recept",
  "špajz",
  "nákup",
  "plán",
  "raňajk",
  "obed",
  "večer",
  "snack",
  "jedlo",
  "jesť",
  "zjesť",
  "gram",
  "porci",
  "hmotnost",
  "váh",
  "schudnút",
  "pribrat",
  "kalori",
];

export const RIVO_FALLBACK_MESSAGE =
  "Ups, Rivo práve odpočíva... 😴 Skús to znova o chvíľu!";

export const INTENT_CLASSIFY_PROMPT = `
Klasifikuj nasledujúcu správu do jednej z kategórií:
- meal_swap: používateľ chce vymeniť jedlo alebo ingredienciu v pláne
- macros: pýta sa na kalórie, makrá, výživové hodnoty
- pantry: pýta sa na obsah špajze alebo čo má doma
- recipe: chce recept alebo postup prípravy
- general: všeobecná otázka o výžive alebo zdraví

Odpovedz LEN jedným slovom (jednou z kategórií vyššie).
Správa: "{{message}}"
`.trim();
