import { z } from "zod";

export const shoppingListIdSchema = z.string().uuid();

export const shoppingListItemCheckSchema = z.object({
  isChecked: z.boolean(),
});

export const shoppingListCheckoutSchema = z.object({
  mode: z.enum(["checked_only", "all"]).default("checked_only"),
  completeList: z.literal(true),
});

export type ShoppingListItemCheckInput = z.infer<
  typeof shoppingListItemCheckSchema
>;
export type ShoppingListCheckoutInput = z.infer<
  typeof shoppingListCheckoutSchema
>;
