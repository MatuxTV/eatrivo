import { db } from "@/index";
import { userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CacheService } from "@/lib/redis";
import type { ShoppingListState } from "../state";

const CACHE_TTL = 300; // 5 min

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

  // ① Redis cache — HIT: preskočíme DB
  const cacheKey = `sl-profile:${userProfileId}`;
  const cached = await CacheService.get<{
    userProfile: unknown;
    userInfo: unknown;
  }>(cacheKey);
  if (cached) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userProfile: cached.userProfile as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userInfo: cached.userInfo as any,
    };
  }

  // ② DB fallback
  try {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    const [info] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfileId));

    if (!profile) {
      return { error: `Profile not found: ${userProfileId}` };
    }

    if (!info) {
      return {
        error: "User nutrition data not found. Please complete onboarding.",
      };
    }

    // ③ Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!info[field as keyof typeof info]) {
        return {
          error: `Missing required field: ${field}. Please update your profile.`,
        };
      }
    }

    // ④ Uložiť do cache
    await CacheService.set(
      cacheKey,
      { userProfile: profile, userInfo: info },
      CACHE_TTL,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { userProfile: profile as any, userInfo: info as any };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "fetch_profile failed",
    };
  }
}
