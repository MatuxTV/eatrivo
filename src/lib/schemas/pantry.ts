import { z } from "zod";

function trimToNull(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function booleanFromQuery(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return false;
  }

  return value;
}

export const pantryIdSchema = z.string().uuid();

export const pantryNameSchema = z.string().trim().min(1).max(200);
export const pantryQuantitySchema = z.number().finite().min(0).max(100000);
export const pantryDeltaSchema = z.number().finite().positive().max(100000);
export const pantryUnitSchema = z.preprocess(
  trimToNull,
  z.string().trim().max(50).nullable(),
);
export const pantryCategorySchema = z.preprocess(
  trimToNull,
  z.string().trim().max(100).nullable(),
);
export const pantryAmountLabelSchema = z.preprocess(
  trimToNull,
  z.string().trim().max(100).nullable(),
);
export const pantryTrackingModeSchema = z.enum(["quantity", "availability"]);
export const pantryInStockSchema = z.boolean();
export const pantryExpiryDateSchema = z.preprocess(
  trimToNull,
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .nullable(),
);

export const pantryListQuerySchema = z.object({
  lowStockOnly: z.preprocess(booleanFromQuery, z.boolean()).default(false),
});

export const pantryConsumeRecipeIngredientSchema = z.object({
  name: pantryNameSchema,
  quantityValue: pantryQuantitySchema.nullable().optional(),
  unit: pantryUnitSchema.optional(),
  ingredientKey: z.string().trim().max(160).nullable().optional(),
  ingredientSpecificKey: z.string().trim().max(200).nullable().optional(),
});

export const pantryConsumeRecipeMatchSchema = z.object({
  recipeIngredientName: pantryNameSchema,
  pantryIngredientName: pantryNameSchema.nullable(),
  matchType: z.enum(["exact", "fallback"]),
});

export const pantryConsumeRecipeSchema = z.object({
  recipeId: z.string().trim().min(1).max(120).optional(),
  recipeTitle: z.string().trim().min(1).max(200),
  ingredientItems: z.array(pantryConsumeRecipeIngredientSchema).min(1).max(50),
  matchedIngredients: z.array(pantryConsumeRecipeMatchSchema).max(50).default([]),
});

export const pantryCreateItemSchema = z
  .object({
    name: pantryNameSchema,
    trackingMode: pantryTrackingModeSchema.optional(),
    inStock: pantryInStockSchema.optional(),
    quantity: pantryQuantitySchema.nullable().optional(),
    unit: pantryUnitSchema.optional(),
    category: pantryCategorySchema.optional(),
    expiryDate: pantryExpiryDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const trackingMode = value.trackingMode ?? "quantity";

    if (trackingMode === "quantity" && value.inStock !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "inStock is only allowed for availability mode",
        path: ["inStock"],
      });
    }
  });

export const pantryUpdateItemSchema = z
  .object({
    name: pantryNameSchema.optional(),
    trackingMode: pantryTrackingModeSchema.optional(),
    inStock: pantryInStockSchema.optional(),
    quantity: pantryQuantitySchema.nullable().optional(),
    unit: pantryUnitSchema.optional(),
    category: pantryCategorySchema.optional(),
    expiryDate: pantryExpiryDateSchema.optional(),
    quantityOperation: z.enum(["increment", "decrement"]).optional(),
    quantityDelta: pantryDeltaSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasMutation =
      value.name !== undefined ||
      value.quantity !== undefined ||
      value.unit !== undefined ||
      value.category !== undefined ||
      value.expiryDate !== undefined ||
      value.quantityOperation !== undefined ||
      value.quantityDelta !== undefined;

    if (!hasMutation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
      });
    }

    if (value.quantityOperation && value.quantityDelta === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityDelta is required for quantityOperation",
        path: ["quantityDelta"],
      });
    }

    if (!value.quantityOperation && value.quantityDelta !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityOperation is required for quantityDelta",
        path: ["quantityOperation"],
      });
    }

    if (value.quantityOperation !== undefined && value.quantity !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either quantity or quantityOperation, not both",
        path: ["quantity"],
      });
    }

    if (value.trackingMode === "quantity" && value.inStock !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "inStock is only allowed for availability mode",
        path: ["inStock"],
      });
    }
  });

export const shoppingListCurrentMutationSchema = z
  .object({
    name: pantryNameSchema.optional(),
    amountLabel: pantryAmountLabelSchema.optional(),
    quantity: pantryQuantitySchema.nullable().optional(),
    unit: pantryUnitSchema.optional(),
    category: pantryCategorySchema.optional(),
    pantryItemId: pantryIdSchema.optional(),
    pantryItemIds: z.array(pantryIdSchema).min(1).max(100).optional(),
    lowStockOnly: z.boolean().optional().default(false),
    appendPackage: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    const sourceCount =
      (value.name ? 1 : 0) +
      (value.pantryItemId ? 1 : 0) +
      (value.pantryItemIds?.length ? 1 : 0) +
      (value.lowStockOnly && !value.pantryItemIds?.length ? 1 : 0);

    if (sourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one source: name, pantryItemId, pantryItemIds, or lowStockOnly",
      });
    }
  });

export type PantryCreateItemInput = z.infer<typeof pantryCreateItemSchema>;
export type PantryUpdateItemInput = z.infer<typeof pantryUpdateItemSchema>;
export type PantryListQueryInput = z.infer<typeof pantryListQuerySchema>;
export type ShoppingListCurrentMutationInput = z.infer<
  typeof shoppingListCurrentMutationSchema
>;
