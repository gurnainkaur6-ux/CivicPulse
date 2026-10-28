import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter - works without Redis
 * For production, upgrade to Upstash Redis
 */

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

// Clean up old entries every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetAt < now) {
        delete store[key];
      }
    }
  }, 60000);
}

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per interval
}

/**
 * Check rate limit for identifier
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 }
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = identifier;

  // Clean up expired entry
  if (store[key] && store[key].resetAt < now) {
    delete store[key];
  }

  // Initialize or get current state
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetAt: now + config.interval,
    };
  }

  const current = store[key];

  // Check if limit exceeded
  if (current.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  // Increment counter
  current.count++;

  return {
    success: true,
    remaining: config.maxRequests - current.count,
    resetAt: current.resetAt,
  };
}

/**
 * Rate limit middleware helper
 * Returns null if under limit, error response if over limit
 */
export async function withRateLimit(
  request: NextRequest,
  identifier: string,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await rateLimit(identifier, config);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": config?.maxRequests.toString() || "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetAt.toString(),
          "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null; // No rate limit hit
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  
  // Fallback to IP address
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || 
             "unknown";
  return `ip:${ip}`;
}
