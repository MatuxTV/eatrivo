// lib/cache.ts
import { redis } from './redis'
import { cacheLogger } from './logger'

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    
    try {
      const data = await redis.get(key)
      if (!data) return null
      
      // Redis may return string or already parsed object
      if (typeof data === 'string') {
        return JSON.parse(data) as T
      }
      return data as T
    } catch (error) {
      cacheLogger.error('Cache get error', error, { metadata: { key } })
      return null
    }
  }

  static async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    try {
      // Always stringify for consistency
      const serialized = typeof data === 'string' ? data : JSON.stringify(data)
      await redis.setex(key, ttl, serialized)
    
    } catch (error) {
      cacheLogger.error('Cache set error', error, { metadata: { key, ttl } })
      // Don't throw - caching is optional
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    
    } catch (error) {
      cacheLogger.error('Cache delete error', error, { metadata: { key } })
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      
      }
    } catch (error) {
      cacheLogger.error('Cache invalidation error', error, { metadata: { pattern } })
    }
  }

  // Helper for meal plans
  static async getMealPlan<T = unknown>(userProfileId: string, shoppingListId: string): Promise<T | null> {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`
    return this.get<T>(key)
  }

  static async setMealPlan<T>(
    userProfileId: string, 
    shoppingListId: string, 
    mealPlan: T, 
    ttl: number = 86400 // 24 hours default
  ): Promise<void> {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`
    await this.set(key, mealPlan, ttl)
  }
}