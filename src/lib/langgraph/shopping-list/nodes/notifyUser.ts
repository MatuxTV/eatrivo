import { sendPushToUser } from "@/lib/pwa/sendPushToAll";
import type { ShoppingListState } from "../state";
import { apiLogger } from "@/lib/logger";

export async function notifyUser(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  // Ak user nemá push subscripciu, ticho preskočíme — nie je to chyba
  if (!state.userId || !state.savedShoppingList) return {};

  const title =
    (state.savedShoppingList as { title?: string })?.title ?? "Nákupný zoznam";
  const hasMealPlan = !!state.savedMealPlan;

  try {
    await sendPushToUser(state.userId, {
      title: "🛒 Tvoj nákupný zoznam je hotový!",
      body: hasMealPlan
        ? `${title} a jedálny plán sú pripravené.`
        : `${title} je pripravený.`,
      icon: "/logo/favicon_io/android-chrome-192x192.png",
      badge: "/logo/favicon_io/favicon-32x32.png",
      url: "/dashboard",
      data: {
        type: "shopping_list_ready",
        shoppingListId: (state.savedShoppingList as { id?: string })?.id,
      },
    });
    apiLogger.info("[notifyUser] push notification sent", {
      metadata: { userId: state.userId, hasMealPlan },
    });
  } catch (err) {
    // Push notifikácia nie je kritická — nesmie zabiť graf
    // User videl SSE progress bar a dostane data cez type:"done" event
    apiLogger.warn(
      `[notifyUser] Push notification failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {};
}
