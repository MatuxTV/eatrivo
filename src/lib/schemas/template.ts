import { z } from "zod";

// Enum schemas matching database enums
export const goalEnumSchema = z.enum([
  "lose_weight",
  "maintain_weight",
  "gain_muscle",
]);

export const dietEnumSchema = z.enum([
  "none",
  "lactosefree",
  "vegetarian",
  "vegan",
  "pescatarian",
  "ketogenic",
  "paleolithic",
]);

// Shopping List Template Schema
export const shoppingListTemplateSchema = z.object({
  goal: goalEnumSchema,
  diet: dietEnumSchema,
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(500).optional(),
  markdownContent: z.string().min(10, "Content must be at least 10 characters"),
  isActive: z.boolean().default(true),
});

// Meal Plan Template Schema
export const mealPlanTemplateSchema = z.object({
  shoppingListTemplateId: z.string().uuid(),
  goal: goalEnumSchema,
  diet: dietEnumSchema,
  meals: z.record(z.string(), z.any()), // JSON structure for meal plan
  isActive: z.boolean().default(true),
});

// Create Template Schema (for API requests)
export const createTemplateSchema = z.object({
  shoppingList: shoppingListTemplateSchema,
  mealPlan: mealPlanTemplateSchema.optional(),
  includeMealPlan: z.boolean().default(false),
});

// Update Template Schema (partial update)
export const updateTemplateSchema = shoppingListTemplateSchema.partial().omit({
  goal: true,
  diet: true,
}); // Can't change goal/diet of existing template

// Filter/Query Schema
export const templateFilterSchema = z.object({
  goal: goalEnumSchema.optional(),
  diet: dietEnumSchema.optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type Goal = z.infer<typeof goalEnumSchema>;
export type Diet = z.infer<typeof dietEnumSchema>;
export type ShoppingListTemplate = z.infer<typeof shoppingListTemplateSchema>;
export type MealPlanTemplate = z.infer<typeof mealPlanTemplateSchema>;
export type CreateTemplate = z.infer<typeof createTemplateSchema>;
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;
export type TemplateFilter = z.infer<typeof templateFilterSchema>;
