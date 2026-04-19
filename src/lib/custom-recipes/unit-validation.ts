export {
  RECIPE_ALLOWED_UNITS as CUSTOM_RECIPE_ALLOWED_UNITS,
  describeRecipeIngredientUnitRule as describeIngredientUnitRule,
  parseRecipeAmount as parseCustomRecipeAmount,
  resolveRecipeUnitExpectation as resolveCustomRecipeUnitExpectation,
  validateRecipeIngredientAmountFormat as validateCustomRecipeIngredientAmountFormat,
  validateRecipeIngredientUnit as validateCustomRecipeIngredientUnit,
  validateRecipeIngredientUnitSemantics as validateCustomRecipeIngredientUnitSemantics,
} from "@/lib/recipes/recipe-unit-validation";

export type {
  ParsedRecipeAmount as ParsedCustomRecipeAmount,
  RecipeAllowedUnit as CustomRecipeAllowedUnit,
  RecipeIngredientForm as CustomRecipeIngredientForm,
  RecipeUnitExpectation as CustomRecipeUnitExpectation,
  RecipeUnitSemanticAudit as CustomRecipeUnitSemanticAudit,
  RecipeUnitSemanticIssue as CustomRecipeUnitSemanticIssue,
  RecipeUnitValidationIssue as CustomRecipeUnitValidationIssue,
} from "@/lib/recipes/recipe-unit-validation";

import type { RecipeUnitValidationErrorType } from "@/lib/recipes/recipe-unit-validation";

export type CustomRecipeValidationErrorType =
  | RecipeUnitValidationErrorType
  | "unit_repair_failed"
  | "preferences_only_unavailable";