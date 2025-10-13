// lib/cache.ts
import { redis } from './redis'

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key)
      return data ? JSON.parse(data as string) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  static async set(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }
  static async cacheAIInsights(userId: string, insights: any, ttl: number = 21600) {
    const key = `ai-insights:${userId}:${new Date().toISOString().slice(0, 10)}`
    await this.set(key, insights, ttl)
    
    // Also cache a quick lookup
    await this.set(`ai-insights-meta:${userId}`, {
      lastGenerated: new Date().toISOString(),
      hasInsights: true
    }, ttl)
  }

  static async getAIInsights(userId: string) {
    const key = `ai-insights:${userId}:${new Date().toISOString().slice(0, 10)}`
    return await this.get(key)
  }

  static async invalidateUserAICache(userId: string) {
    const pattern = `ai-insights:${userId}:*`
    await this.invalidatePattern(pattern)
  }
}