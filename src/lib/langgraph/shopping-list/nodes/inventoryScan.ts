import type { ShoppingListState } from "../state";

// TODO: Implementovať po pridaní inventoryContext tabuľky do schema.ts
// Klasifikovať items, vypočítať zostatok

export async function inventoryScan(
  _state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  return { virtualPantry: null };
}
