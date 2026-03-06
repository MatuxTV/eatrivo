import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Initialize Redis client (only if env vars are present)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Different rate limiters for different use cases
export const rateLimiters = {
  // Standard API calls - 30 requests per minute
  standard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "rl:standard",
      })
    : null,

  // Expensive operations (AI, Stripe) - 10 requests per minute
  expensive: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "rl:expensive",
      })
    : null,

  // Auth attempts - 5 per minute
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "rl:auth",
      })
    : null,

  // Feedback/contact - 3 per minute
  feedback: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 m"),
        prefix: "rl:feedback",
      })
    : null,

  // Webhooks and cron - 100 per minute
  webhook: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "rl:webhook",
      })
    : null,

  // Analytics events - 50 per minute
  analytics: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, "1 m"),
        prefix: "rl:analytics",
      })
    : null,
};

export type RateLimitType = keyof typeof rateLimiters;

/**
 * Check rate limit for a given identifier
 * @param identifier - Usually user ID or IP address
 * @param type - Type of rate limiter to use
 * @returns Object with success status and optional response
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "standard",
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = rateLimiters[type];

  // If Redis is not configured, fail-closed in production, allow in dev
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Rate Limit] Redis not configured in production! Blocking request.",
      );
      return {
        success: false,
        response: NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503 },
        ),
      };
    }
    console.warn(
      "[Rate Limit] Redis not configured, skipping rate limit check (dev mode)",
    );
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } =
      await limiter.limit(identifier);

    if (!success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Too many requests",
            message: "Please slow down and try again later",
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
              "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          },
        ),
      };
    }

    return { success: true };
  } catch (error) {
    // If rate limiting fails, fail-closed in production, allow in dev
    console.error("[Rate Limit] Error checking rate limit:", error);
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503 },
        ),
      };
    }
    return { success: true };
  }
}

/**
 * Get identifier for rate limiting from request
 * Prefers user ID, falls back to IP
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string | null,
): string {
  if (userId) return `user:${userId}`;

  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "anonymous";

  return `ip:${ip}`;
}
