// lib/cache.ts
import { redis } from './redis'

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
      console.error('❌ Cache get error:', error)
      return null
    }
  }

  static async set(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      // Always stringify for consistency
      const serialized = typeof data === 'string' ? data : JSON.stringify(data)
      await redis.setex(key, ttl, serialized)
      console.log(`✅ Cached: ${key} (TTL: ${ttl}s)`)
    } catch (error) {
      console.error('❌ Cache set error:', error)
      // Don't throw - caching is optional
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key)
      console.log(`🗑️ Deleted cache: ${key}`)
    } catch (error) {
      console.error('❌ Cache delete error:', error)
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        console.log(`🗑️ Invalidated ${keys.length} keys matching: ${pattern}`)
      }
    } catch (error) {
      console.error('❌ Cache invalidation error:', error)
    }
  }

  // Helper for meal plans
  static async getMealPlan(userProfileId: string, shoppingListId: string) {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`
    return this.get<any>(key)
  }

  static async setMealPlan(
    userProfileId: string, 
    shoppingListId: string, 
    mealPlan: any, 
    ttl: number = 86400 // 24 hours default
  ) {
    const key = `meal-plan:${userProfileId}:${shoppingListId}`
    await this.set(key, mealPlan, ttl)
  }
}