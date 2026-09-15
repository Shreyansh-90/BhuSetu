/**
 * rate-limit.ts
 * 
 * Basic in-memory rate limiter for Node.js environments.
 * 
 * PRODUCTION GAP WARNING: 
 * This uses a simple Map which is NOT suitable for serverless environments (like Vercel Edge/Serverless)
 * or multi-instance deployments because state is not shared across instances and resets on cold boots.
 * For production, this should be replaced with Upstash/Redis or Cloudflare Rate Limiting.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimiterMap = new Map<string, RateLimitRecord>();

export async function checkRateLimit(ip: string, limit: number = 10, windowMs: number = 60000): Promise<{ success: boolean; current: number }> {
  const now = Date.now();
  const record = rateLimiterMap.get(ip);

  if (!record) {
    rateLimiterMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, current: 1 };
  }

  if (now > record.resetAt) {
    // Window expired, reset
    rateLimiterMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, current: 1 };
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    return { success: false, current: record.count };
  }

  // Increment
  record.count += 1;
  return { success: true, current: record.count };
}