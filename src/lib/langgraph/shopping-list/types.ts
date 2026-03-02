export type MacroTargets = {
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type ShoppingHistoryItem = {
  id: string;
  title: string;
  weekStartDate: Date;
};

export type EstimatedMacros = {
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type AiShoppingOutput = {
  title: string;
  description: string;
  markdown: string;
  estimatedMacros: EstimatedMacros;
};

export type ShoppingListGraphInput = {
  userId: string;
  userProfileId: string;
};

export type SseProgressEvent = {
  type: "progress";
  node: string;
  progress: number;
  label: string;
  retryCount: number;
};

export type SseDoneEvent = {
  type: "done";
  shoppingList: Record<string, unknown>;
  mealPlan: Record<string, unknown> | null;
};

export type SseErrorEvent = {
  type: "error";
  message: string;
};
