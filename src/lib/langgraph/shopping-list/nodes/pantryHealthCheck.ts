import type { ShoppingListState } from "../state";

// TODO: Implementovať po pridaní inventoryContext tabuľky do schema.ts
// Query: SELECT * FROM inventoryContext WHERE userProfileId = ? AND expiryDate < NOW()

export async function pantryHealthCheck(
  _state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  return { pantryHealthy: true, expiredItems: [] };
}
