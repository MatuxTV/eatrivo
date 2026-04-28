import { asc, eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type { PantryReceiptScanState } from "../state";

export async function fetchContext(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  const [userProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, state.userProfileId));

  if (!userProfile) {
    return {
      fatalError: "Profile not found.",
      fatalErrorCode: "PROFILE_NOT_FOUND",
    };
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
    requestError: null,
    fatalError: null,
    fatalErrorCode: null,
  };
}