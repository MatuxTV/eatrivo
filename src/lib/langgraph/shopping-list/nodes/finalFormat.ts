import type { ShoppingListState } from "../state";

/**
 * No-op node — placeholder pre budúce rozšírenia (dual formát, PDF atď.)
 */
export async function finalFormat(
  _state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  return {};
}
