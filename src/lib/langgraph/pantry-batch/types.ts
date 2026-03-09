export interface PantryBatchInputItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
}

export interface PantryBatchSuggestion {
  rawName: string;
  normalizedName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  alreadyExists: boolean;
  matchedExistingIngredientKey: string | null;
  matchedExistingIngredientSpecificKey: string | null;
  category: string | null;
  confidence: number | null;
  reason: string | null;
}

export interface PantryBatchProcessedItem {
  rawName: string;
  normalizedName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  action: "inserted" | "updated" | "skipped";
  pantryItemId: string | null;
  source: string;
  reason: string | null;
  candidateKeys: string[];
}

export interface PantryBatchGraphInput {
  userId: string;
  userProfileId: string;
  items: PantryBatchInputItem[];
}
