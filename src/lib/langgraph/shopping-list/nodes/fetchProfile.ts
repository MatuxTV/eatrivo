import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { getUserContext } from "@/lib/user-context-cache";
import type { ShoppingListState } from "../state";

const REQUIRED_FIELDS = [
  "sex",
  "dateOfBirth",
  "height",
  "weight",
  "activity_level",
  "goal",
  "meal_per_day",
  "budget_preference",
] as const;

export async function fetchProfile(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { userProfileId } = state;

  apiLogger.info("[fetchProfile] start", { metadata: { userProfileId } });

  try {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    if (!profile) {
      apiLogger.error("[fetchProfile] profile not found", undefined, { metadata: { userProfileId } });
      return { error: `Profile not found: ${userProfileId}` };
    }

    const context = await getUserContext(profile.userId);

    if (!context.userInfo) {
      return {
        error: "User nutrition data not found. Please complete onboarding.",
      };
    }

    // ③ Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!context.userInfo[field as keyof typeof context.userInfo]) {
        apiLogger.error("[fetchProfile] missing required field", undefined, { metadata: { userProfileId, field } });
        return {
          error: `Missing required field: ${field}. Please update your profile.`,
        };
      }
    }

    apiLogger.info("[fetchProfile] DB load success", { metadata: { userProfileId, goal: context.userInfo.goal, language: context.userInfo.language } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      userProfile: context.userProfile as any,
      userInfo: context.userInfo as any,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "fetch_profile failed",
    };
  }
}
