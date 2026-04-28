import { eq } from "drizzle-orm";

import { badges, userInfoTable, userProfiles, users } from "@/db/schema";
import { db } from "@/index";
import {
  SUBSCRIPTION_SNAPSHOT_CACHE_TTL_SECONDS,
  USER_CONTEXT_CACHE_TTL_SECONDS,
  subscriptionSnapshotCacheKey,
  userContextCacheKey,
} from "@/lib/cache/cache-keys";
import { CacheService } from "@/lib/cache/redis";

type CachedUserProfile = typeof userProfiles.$inferSelect | null;
type CachedUserInfo = typeof userInfoTable.$inferSelect | null;
type CachedMembership = typeof users.$inferSelect["membership"] | null;

export interface CachedUserContext {
  userProfile: CachedUserProfile;
  userInfo: CachedUserInfo;
  membership: CachedMembership;
  badges: string[];
}

export async function getUserContext(userId: string): Promise<CachedUserContext> {
  const cacheKey = userContextCacheKey(userId);
  const cached = await CacheService.get<CachedUserContext>(cacheKey);

  if (cached) {
    return cached;
  }

  const [userProfile, user] = await Promise.all([
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { membership: true },
    }),
  ]);

  const [userInfo, userBadges] = userProfile
    ? await Promise.all([
        db.query.userInfoTable.findFirst({
          where: eq(userInfoTable.userProfileId, userProfile.id),
        }),
        db.query.badges.findMany({
          where: eq(badges.userProfileId, userProfile.id),
          columns: { type: true },
        }),
      ])
    : [null, []];

  const record: CachedUserContext = {
    userProfile: userProfile ?? null,
    userInfo: userInfo ?? null,
    membership: user?.membership ?? null,
    badges: userBadges.map((badge) => badge.type),
  };

  await CacheService.set(cacheKey, record, USER_CONTEXT_CACHE_TTL_SECONDS);

  return record;
}

export async function invalidateUserContextCaches(userId: string): Promise<void> {
  await Promise.all([
    CacheService.del(userContextCacheKey(userId)),
    CacheService.del(subscriptionSnapshotCacheKey(userId)),
  ]);
}

export async function cacheSubscriptionSnapshot<T>(
  userId: string,
  snapshot: T,
  ttlSeconds: number = SUBSCRIPTION_SNAPSHOT_CACHE_TTL_SECONDS,
): Promise<void> {
  await CacheService.set(subscriptionSnapshotCacheKey(userId), snapshot, ttlSeconds);
}