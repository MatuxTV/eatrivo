import test from "node:test";
import assert from "node:assert/strict";

import { PHOTO_DAILY_QUOTA } from "./constants";
import {
  dailyPhotoLimit,
  photoQuotaDayKey,
  photoQuotaRedisKey,
  remainingPhotoQuota,
  secondsUntilUtcMidnight,
} from "./quota";

test("dailyPhotoLimit returns the free or paid plan limit", () => {
  assert.equal(dailyPhotoLimit(false), PHOTO_DAILY_QUOTA.free);
  assert.equal(dailyPhotoLimit(true), PHOTO_DAILY_QUOTA.paid);
  assert.equal(dailyPhotoLimit(false), 5);
  assert.equal(dailyPhotoLimit(true), 60);
});

test("remainingPhotoQuota never goes negative and ignores negative usage", () => {
  assert.equal(remainingPhotoQuota(5, 0), 5);
  assert.equal(remainingPhotoQuota(5, 3), 2);
  assert.equal(remainingPhotoQuota(5, 5), 0);
  assert.equal(remainingPhotoQuota(5, 6), 0);
  assert.equal(remainingPhotoQuota(5, -3), 5);
  assert.equal(remainingPhotoQuota(0, 0), 0);
});

test("photoQuotaDayKey is the UTC calendar day", () => {
  assert.equal(photoQuotaDayKey(new Date("2026-10-20T00:00:00.000Z")), "2026-10-20");
  assert.equal(photoQuotaDayKey(new Date("2026-10-20T23:59:59.999Z")), "2026-10-20");
  // an instant that is already the next day in a positive-offset zone stays UTC
  assert.equal(photoQuotaDayKey(new Date("2026-01-05T02:30:00.000Z")), "2026-01-05");
  assert.equal(photoQuotaDayKey(new Date("2025-12-31T23:00:00.000Z")), "2025-12-31");
});

test("photoQuotaRedisKey namespaces the counter per profile and day", () => {
  const now = new Date("2026-10-20T10:00:00.000Z");
  assert.equal(photoQuotaRedisKey("profile-abc", now), "photo-scan:profile-abc:2026-10-20");
  assert.notEqual(
    photoQuotaRedisKey("profile-abc", now),
    photoQuotaRedisKey("profile-def", now),
  );
  assert.notEqual(
    photoQuotaRedisKey("profile-abc", now),
    photoQuotaRedisKey("profile-abc", new Date("2026-10-21T10:00:00.000Z")),
  );
});

test("secondsUntilUtcMidnight counts down to the next UTC midnight", () => {
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T00:00:00.000Z")), 86_400);
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T12:00:00.000Z")), 43_200);
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T23:58:00.000Z")), 120);
  // month rollover: October 31 -> November 1
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-31T12:00:00.000Z")), 43_200);
});

test("secondsUntilUtcMidnight never returns less than 60 s", () => {
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T23:59:00.000Z")), 60);
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T23:59:30.000Z")), 60);
  assert.equal(secondsUntilUtcMidnight(new Date("2026-10-20T23:59:59.999Z")), 60);
});
