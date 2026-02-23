import { db } from "@/index";
import { userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CacheService } from "@/lib/redis";
import type { ChatState } from "../state";

const CACHE_TTL = 300; // 5 min

export async function fetchProfile(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userProfileId } = state;

  // ① Redis cache — HIT: preskočíme DB
  const cacheKey = `chat-profile:${userProfileId}`;
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

    if (!profile) throw new Error(`Profile not found: ${userProfileId}`);

    // ③ Uložiť do cache pre ďalšie správy v tom istom okne
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
