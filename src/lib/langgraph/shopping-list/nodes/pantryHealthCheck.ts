import { db } from "@/index";
import { pantryItems } from "@/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import type { ShoppingListState } from "../state";

/**
 * pantryHealthCheck — Checks for expired or near-expiry pantry items.
 * Warns about items expiring within the next 3 days.
 */
export async function pantryHealthCheck(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  try {
    const { userProfileId } = state;
    if (!userProfileId) {
      return { pantryHealthy: true, expiredItems: [] };
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find items expiring within 3 days (including already expired)
    const nearExpiry = await db
      .select({ name: pantryItems.name, expiryDate: pantryItems.expiryDate })
      .from(pantryItems)
      .where(
        and(
          eq(pantryItems.userProfileId, userProfileId),
          lt(pantryItems.expiryDate, threeDaysFromNow),
          isNotNull(pantryItems.expiryDate),
        ),
      );

    const expiredNames = nearExpiry
      .filter((item) => item.expiryDate !== null)
      .map((item) => item.name);

    const pantryHealthy = expiredNames.length === 0;

    apiLogger.info("pantryHealthCheck completed", {
      metadata: {
        userProfileId,
        nearExpiryCount: expiredNames.length,
      },
    });

    return {
      pantryHealthy,
      expiredItems: expiredNames,
    };
  } catch (error) {
    apiLogger.error("pantryHealthCheck error (non-fatal)", { error });
    // Non-fatal: continue with healthy state even if check fails
    return { pantryHealthy: true, expiredItems: [] };
  }
}
