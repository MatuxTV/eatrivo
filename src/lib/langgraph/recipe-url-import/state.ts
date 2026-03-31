import { Annotation } from "@langchain/langgraph";

export const RecipeUrlImportState = Annotation.Root({
  recipeUrls: Annotation<string[]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => [],
  }),
  selectedRecipeUrl: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  outputPath: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  rulesDocument: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  rulesSummary: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  checkedRecipesExample: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  pageText: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  jsonLdText: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  prompt: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  rawAiResponse: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  normalizedJson: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  importCompleted: Annotation<boolean>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => false,
  }),
  error: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
});