import { asc, eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import type { PantryBatchState } from "../state";

export async function fetchContext(
  state: typeof PantryBatchState.State,
): Promise<Partial<typeof PantryBatchState.State>> {
  apiLogger.info("[pantryBatch.fetchContext] start", {
    metadata: {
      userProfileId: state.userProfileId,
      itemCount: state.pendingItems.length,
    },
  });

  if (state.pendingItems.length === 0) {
    return { error: "No pantry items were provided." };
  }

  const [userProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, state.userProfileId));

  if (!userProfile) {
    return { error: "Profile not found." };
  }

  const [userInfo] = await db
    .select()
    .from(userInfoTable)
    .where(eq(userInfoTable.userProfileId, state.userProfileId));

  const currentPantry = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userProfileId, state.userProfileId))
    .orderBy(asc(pantryItems.createdAt));

  return {
    userProfile,
    userInfo: userInfo ?? null,
    locale: userInfo?.language ?? "sk",
    currentPantry,
  };
}
