import { and, eq } from "drizzle-orm";

import { userInfoTable, userProfiles } from "@/db/schema";
import { db } from "@/lib/db/pool";
import { apiLogger } from "@/lib/logger";
import { normalizeRecipeLocale } from "@/lib/recipe-localization";
import type { CustomRecipeState } from "../state";

export async function fetchProfile(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  try {
    const profile = await db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, state.userProfileId),
        eq(userProfiles.userId, state.userId),
      ),
    });

    if (!profile) {
      return {
        fatalError: "Profile not found",
        fatalErrorCode: "PROFILE_NOT_FOUND",
      };
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, profile.id),
    });

    if (!userInfo) {
      return {
        fatalError: "User profile details not found",
        fatalErrorCode: "PROFILE_DETAILS_NOT_FOUND",
      };
    }

    return {
      userProfile: profile,
      userInfo,
      userProfileId: profile.id,
      locale: normalizeRecipeLocale(
        state.locale || userInfo.language || "en",
      ) as "en" | "sk",
      fatalError: null,
      fatalErrorCode: null,
    };
  } catch (error) {
    apiLogger.error("[customRecipe.fetchProfile] failed", error, {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
      },
    });

    return {
      fatalError: "Failed to load profile",
      fatalErrorCode: "PROFILE_FETCH_FAILED",
    };
  }
}
