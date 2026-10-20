import { PHOTO_DAILY_QUOTA } from "./constants";

export function dailyPhotoLimit(isPaid: boolean): number {
  return isPaid ? PHOTO_DAILY_QUOTA.paid : PHOTO_DAILY_QUOTA.free;
}

export function remainingPhotoQuota(limit: number, used: number): number {
  return Math.max(0, limit - Math.max(0, used));
}

/** UTC day key, e.g. 2026-10-20 */
export function photoQuotaDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function photoQuotaRedisKey(userProfileId: string, now: Date): string {
  return `photo-scan:${userProfileId}:${photoQuotaDayKey(now)}`;
}

/** TTL so the counter disappears right after the UTC day ends (min 60 s). */
export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
}
