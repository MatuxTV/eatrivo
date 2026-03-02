import type { ShoppingListState } from "../state";
import { apiLogger } from "@/lib/logger";

/**
 * No-op node — placeholder pre budúce rozšírenia (dual formát, PDF atď.)
 */
export async function finalFormat(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  apiLogger.info("[finalFormat] pass-through", { metadata: { userProfileId: state.userProfileId } });
  return {};
}
