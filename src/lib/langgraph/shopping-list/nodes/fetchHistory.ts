import { db } from "@/index";
import { shoppingLists } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import type { ShoppingListState } from "../state";
import type { ShoppingHistoryItem } from "../types";

export async function fetchHistory(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { userProfileId } = state;

  apiLogger.info("[fetchHistory] start", { metadata: { userProfileId } });

  try {
    const rows = await db
      .select({
        id: shoppingLists.id,
        title: shoppingLists.title,
        weekStartDate: shoppingLists.weekStartDate,
      })
      .from(shoppingLists)
      .where(eq(shoppingLists.userProfileId, userProfileId))
      .orderBy(desc(shoppingLists.created_at))
      .limit(3);

    const shoppingHistory: ShoppingHistoryItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      weekStartDate: r.weekStartDate,
    }));

    apiLogger.info("[fetchHistory] success", { metadata: { userProfileId, historyCount: shoppingHistory.length } });

    return { shoppingHistory };
  } catch (err) {
    apiLogger.warn("[fetchHistory] failed (non-fatal), continuing without history", { metadata: { userProfileId, err } });
    // Non-critical — continue without history
    return { shoppingHistory: [] };
  }
}
