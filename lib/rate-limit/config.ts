// lib/rate-limit/config.ts
// Rate limiting configuration using Upstash Redis

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// Note: These environment variables need to be set in .env.local
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Flag to enable/disable rate limiting (useful for development)
export const RATE_LIMIT_ENABLED = process.env.ENABLE_RATE_LIMITING !== 'false';

// ==========================================
// AUTHENTICATION RATE LIMITERS
// ==========================================

// Login attempts: 5 requests per 15 minutes per IP
export const loginRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@ratelimit/login',
}) : null;

// Signup attempts: 3 registrations per hour per IP
export const signupRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@ratelimit/signup',
}) : null;

// ==========================================
// AI ANALYSIS RATE LIMITERS
// ==========================================

// AI analysis requests: 10 requests per minute per user
export const aiAnalysisRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: '@ratelimit/ai-analysis',
}) : null;

// AI daily free tier limit: 10 requests per day per user
export const aiFreeTierDailyLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 d'),
    analytics: true,
    prefix: '@ratelimit/ai-free-tier',
}) : null;

// AI pro tier daily limit: 100 requests per day per user
export const aiProTierDailyLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 d'),
    analytics: true,
    prefix: '@ratelimit/ai-pro-tier',
}) : null;

// ==========================================
// TRADE MANAGEMENT RATE LIMITERS
// ==========================================

// Bulk CSV/Excel import: 5 imports per hour per user
export const bulkImportRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: '@ratelimit/bulk-import',
}) : null;

// Trade creation: 100 per hour per user (prevents spam)
export const tradeCreationRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
    prefix: '@ratelimit/trade-creation',
}) : null;

// ==========================================
// GENERAL API RATE LIMITER
// ==========================================

// General API: 100 requests per minute per user
export const generalApiRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: '@ratelimit/general-api',
}) : null;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get identifier for rate limiting (IP address or user ID)
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
    // Prefer user ID if authenticated
    if (userId) {
        return `user:${userId}`;
    }

    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `ip:${ip}`;
}

/**
 * Check if rate limit is exceeded
 * Returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string
): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}> {
    // If rate limiting is disabled or no limiter, allow request
    if (!RATE_LIMIT_ENABLED || !limiter) {
        return { success: true, limit: 999999, remaining: 999999, reset: 0 };
    }

    try {
        const result = await limiter.limit(identifier);
        return result;
    } catch (error) {
        console.error('Rate limit check error:', error);
        // On error, allow the request but log the issue
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
}
