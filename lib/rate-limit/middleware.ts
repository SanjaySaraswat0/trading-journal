// lib/rate-limit/middleware.ts
// Rate limiting middleware helpers

import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { checkRateLimit, getRateLimitIdentifier } from './config';

/**
 * Rate limit middleware wrapper for API routes
 * Usage: await rateLimitMiddleware(request, userId, limiter);
 */
export async function rateLimitMiddleware(
    request: Request,
    userId: string | undefined,
    limiter: Ratelimit | null,
    options: {
        blockMessage?: string;
    } = {}
): Promise<NextResponse | null> {
    const identifier = getRateLimitIdentifier(request, userId);
    const result = await checkRateLimit(limiter, identifier);

    // Set rate limit headers
    const headers = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
    };

    // If rate limit exceeded, return 429 error
    if (!result.success) {
        const resetDate = new Date(result.reset);
        const message = options.blockMessage ||
            `Rate limit exceeded. Try again at ${resetDate.toISOString()}`;

        return NextResponse.json(
            {
                error: message,
                retryAfter: result.reset,
            },
            {
                status: 429,
                headers,
            }
        );
    }

    // Rate limit passed, return null to continue
    return null;
}

/**
 * Create a rate-limited response with headers
 */
export function createRateLimitedResponse(
    data: any,
    status: number = 200,
    rateLimit: {
        limit: number;
        remaining: number;
        reset: number;
    }
): NextResponse {
    return NextResponse.json(data, {
        status,
        headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
    });
}
