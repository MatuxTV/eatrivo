import { db } from "@/index";
import { pantryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import type { ShoppingListState } from "../state";

export type PantryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiryDate: Date | null;
};

/**
 * inventoryScan — Loads all current pantry items for the user.
 * The virtualPantry is used by buildPrompt to tell AI what the user already has.
 */
export async function inventoryScan(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  try {
    const { userProfileId } = state;
    if (!userProfileId) {
      return { virtualPantry: null };
    }

    const items = await db
      .select({
        id: pantryItems.id,
        name: pantryItems.name,
        quantity: pantryItems.quantity,
        unit: pantryItems.unit,
        category: pantryItems.category,
        expiryDate: pantryItems.expiryDate,
      })
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfileId));

    if (items.length === 0) {
      return { virtualPantry: null };
    }

    // Convert numeric strings back to numbers
    const pantry: PantryItem[] = items.map((item) => ({
      ...item,
      quantity: item.quantity ? parseFloat(String(item.quantity)) : null,
    }));

    apiLogger.info("inventoryScan completed", {
      metadata: {
        userProfileId,
        itemCount: pantry.length,
      },
    });

    return { virtualPantry: pantry };
  } catch (error) {
    apiLogger.error("inventoryScan error (non-fatal)", { error });
    return { virtualPantry: null };
  }
}
