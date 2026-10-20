import "server-only";

import { redis } from "@/lib/cache/redis";

import { photoQuotaRedisKey, remainingPhotoQuota, secondsUntilUtcMidnight } from "./quota";

export interface PhotoQuotaReservation {
  ok: boolean;
  /** photos already used today (excluding this request when it was rejected) */
  used: number;
  remaining: number;
}

/** Atomically reserves `count` photos for today; rolls back and returns ok=false when over the limit. */
export async function reservePhotoQuota(input: {
  userProfileId: string;
  count: number;
  limit: number;
  now?: Date;
}): Promise<PhotoQuotaReservation> {
  const now = input.now ?? new Date();
  const key = photoQuotaRedisKey(input.userProfileId, now);
  const used = await redis.incrby(key, input.count);
  await redis.expire(key, secondsUntilUtcMidnight(now));

  if (used > input.limit) {
    await redis.decrby(key, input.count);
    const before = used - input.count;
    return { ok: false, used: before, remaining: remainingPhotoQuota(input.limit, before) };
  }

  return { ok: true, used, remaining: remainingPhotoQuota(input.limit, used) };
}

/** Gives photos back (for photos that failed on our side). */
export async function refundPhotoQuota(input: {
  userProfileId: string;
  count: number;
  now?: Date;
}): Promise<void> {
  if (input.count <= 0) return;
  const key = photoQuotaRedisKey(input.userProfileId, input.now ?? new Date());
  const left = await redis.decrby(key, input.count);
  if (left < 0) await redis.set(key, 0, { ex: secondsUntilUtcMidnight(input.now ?? new Date()) });
}

export async function getPhotoQuotaUsed(userProfileId: string, now: Date = new Date()): Promise<number> {
  const value = await redis.get<number | string | null>(photoQuotaRedisKey(userProfileId, now));
  return Math.max(0, Number(value ?? 0) || 0);
}
