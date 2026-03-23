// lib/redis.ts
import { Redis } from "@upstash/redis";
import { cacheLogger } from "./logger";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;

      // Redis may return string or already parsed object
      if (typeof data === "string") {
        return JSON.parse(data) as T;
      }
      return data as T;
    } catch (error) {
      cacheLogger.error("Cache get error", error, { metadata: { key } });
      return null;
    }
  }

  static async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    try {
      // Always stringify for consistency
      const serialized = typeof data === "string" ? data : JSON.stringify(data);
      await redis.setex(key, ttl, serialized);
    } catch (error) {
      cacheLogger.error("Cache set error", error, { metadata: { key, ttl } });
      // Don't throw - caching is optional
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      cacheLogger.error("Cache delete error", error, { metadata: { key } });
    }
  }

  // Alias for del method (backward compatibility)
  static async delete(key: string): Promise<void> {
    return this.del(key);
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      cacheLogger.error("Cache invalidation error", error, {
        metadata: { pattern },
      });
    }
  }

  // Helper for meal plans
  static async getMealPlan<T = unknown>(
    userProfileId: string,
    shoppingListId: string,
  ): Promise<T | null> {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`;
    return this.get<T>(key);
  }

  static async setMealPlan<T>(
    userProfileId: string,
    shoppingListId: string,
    mealPlan: T,
    ttl: number = 86400, // 24 hours default
  ): Promise<void> {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`;
    await this.set(key, mealPlan, ttl);
  }
}

/**
 * Request lock helper to prevent duplicate long-running operations
 */
export class RequestLock {
  /**
   * Try to acquire a lock for a specific operation
   * @param key - Unique key for the operation (e.g., "meal-plan-generation:userId")
   * @param ttlSeconds - How long the lock should last (default 180s = 3 minutes)
   * @returns true if lock acquired, false if already locked
   */
  static async acquire(
    key: string,
    ttlSeconds: number = 180,
  ): Promise<boolean> {
    const lockKey = `lock:${key}`;
    // SET NX (only if not exists) with expiration
    const result = await redis.set(lockKey, Date.now(), {
      nx: true,
      ex: ttlSeconds,
    });
    return result === "OK";
  }

  /**
   * Check if a lock exists
   * @param key - The lock key to check
   * @returns true if locked, false if not locked
   */
  static async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const exists = await redis.exists(lockKey);
    return exists === 1;
  }

  /**
   * Release a lock manually
   * @param key - The lock key to release
   */
  static async release(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await redis.del(lockKey);
  }

  /**
   * Refresh TTL for an active lock.
   * @param key - The lock key to extend
   * @param ttlSeconds - New TTL in seconds
   */
  static async refresh(key: string, ttlSeconds: number): Promise<void> {
    const lockKey = `lock:${key}`;
    const exists = await redis.exists(lockKey);
    if (exists === 1) {
      await redis.expire(lockKey, ttlSeconds);
    }
  }

  /**
   * Get remaining TTL for a lock
   * @param key - The lock key
   * @returns seconds remaining, or -1 if not locked
   */
  static async getRemainingTime(key: string): Promise<number> {
    const lockKey = `lock:${key}`;
    return await redis.ttl(lockKey);
  }
}

/**
 * Stores generation progress in Redis so the frontend can poll it.
 * Used by the background shopping-list generation flow.
 */
export interface GenerationProgressData {
  progress: number;
  label: string;
  retryCount: number;
  error?: string;
  done?: boolean;
}

export class GenerationProgress {
  private static key(userId: string) {
    return `generation-progress:${userId}`;
  }

  /** Write current progress (called after each LangGraph node). TTL = 5 min safety net. */
  static async set(
    userId: string,
    data: GenerationProgressData,
  ): Promise<void> {
    await redis.setex(this.key(userId), 300, JSON.stringify(data));
  }

  /** Read current progress (called by the status polling endpoint). */
  static async get(userId: string): Promise<GenerationProgressData | null> {
    const raw = await redis.get(this.key(userId));
    if (!raw) return null;
    return typeof raw === "string"
      ? JSON.parse(raw)
      : (raw as GenerationProgressData);
  }

  /** Clear progress after generation completes or fails. */
  static async clear(userId: string): Promise<void> {
    await redis.del(this.key(userId));
  }
}
