import "server-only";

import { redis } from "@/lib/cache/redis";

import { monthKey } from "./budget";

// Spend is stored as integer micro-USD so INCRBY stays exact.
const MICRO = 1_000_000;
const SPEND_TTL_SECONDS = 40 * 24 * 60 * 60;
const LOCK_TTL_SECONDS = 300;

const spendKey = (date?: Date) => `recipe-images:spend:${monthKey(date)}`;
const lockKey = (recipeId: string) => `recipe-images:lock:${recipeId}`;

export async function getMonthlySpendUsd(date?: Date): Promise<number> {
  const value = await redis.get<number | string>(spendKey(date));
  return Number(value ?? 0) / MICRO;
}

export async function addMonthlySpendUsd(amountUsd: number, date?: Date): Promise<void> {
  const key = spendKey(date);
  await redis.incrby(key, Math.round(amountUsd * MICRO));
  await redis.expire(key, SPEND_TTL_SECONDS);
}

export async function acquireRecipeImageLock(recipeId: string): Promise<boolean> {
  const result = await redis.set(lockKey(recipeId), "1", { nx: true, ex: LOCK_TTL_SECONDS });
  return result === "OK";
}

export async function releaseRecipeImageLock(recipeId: string): Promise<void> {
  await redis.del(lockKey(recipeId));
}
