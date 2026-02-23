// app/api/ai/coaching/route.ts
// AI Trading Coach API - Personalized, Data-Driven Coaching
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { aiAnalysisRateLimit, aiFreeTierDailyLimit, aiProTierDailyLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logAI, logError } from '@/lib/logging/logger';
import { getUserTier } from '@/lib/rbac/middleware';
import { runCompleteCoachingAnalysis } from '@/lib/ai/coaching';

export async function POST(request: Request) {
    try {
        logApiRequest('POST', '/api/ai/coaching', undefined);

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            logger.warn('Unauthorized coaching request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply rate limiting
        const rateLimitResult = await rateLimitMiddleware(
            request,
            session.user.id,
            aiAnalysisRateLimit,
            { blockMessage: 'Too many AI requests. Please slow down.' }
        );
        if (rateLimitResult) return rateLimitResult;

        // Check RBAC tier limits for AI usage
        const supabase = createServiceClient();
        const { data: userData } = await supabase
            .from('trades')
            .select('user_id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

        const tier = getUserTier(userData);

        // Check daily AI usage limit based on tier
        const tierLimiter = tier === 'free' ? aiFreeTierDailyLimit : aiProTierDailyLimit;
        if (tierLimiter) {
            const tierLimitResult = await rateLimitMiddleware(
                request,
                session.user.id,
                tierLimiter,
                {
                    blockMessage: `Daily AI coaching limit reached for ${tier} tier. ${tier === 'free' ? 'Upgrade to Pro for more analyses.' : 'Please try again tomorrow.'}`,
                }
            );
            if (tierLimitResult) return tierLimitResult;
        }

        logger.info('Starting AI coaching analysis', { userId: session.user.id, tier });

        // Fetch trades (last 90 days for comprehensive analysis)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);

        const { data: trades, error: fetchError } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('entry_time', cutoffDate.toISOString())
            .order('entry_time', { ascending: false })
            .limit(200); // Max 200 trades for performance

        if (fetchError) {
            logError(fetchError, 'Coaching - trade fetch', { userId: session.user.id });
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!trades || trades.length < 10) {
            logger.info('Not enough trades for coaching', { userId: session.user.id, count: trades?.length || 0 });
            return NextResponse.json({
                success: false,
                message: 'Need at least 10 trades for meaningful coaching analysis',
            }, { status: 400 });
        }

        logger.info('Running coaching analysis', { tradeCount: trades.length, userId: session.user.id });

        // Run complete coaching analysis (100% FREE - no API calls)
        const coaching = runCompleteCoachingAnalysis(trades as any);

        logAI('AI coaching analysis completed', {
            userId: session.user.id,
            tradesAnalyzed: trades.length,
            goalsGenerated: coaching.goals.length,
            warningsIssued: coaching.emergencyWarnings.length,
        });

        return NextResponse.json({
            success: true,
            coaching: {
                profile: coaching.profile,
                goals: coaching.goals,
                keyInsights: coaching.keyInsights,
                emergencyWarnings: coaching.emergencyWarnings,
                detailedPatterns: coaching.patterns, // Include full pattern analysis
            },
            tradesAnalyzed: trades.length,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        logError(error, 'POST /api/ai/coaching');
        return NextResponse.json({
            error: error.message || 'Coaching analysis failed',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        logApiRequest('GET', '/api/ai/coaching', undefined);

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            logger.warn('Unauthorized coaching fetch');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For now, return message. In future, could cache results in DB
        return NextResponse.json({
            message: 'Use POST method to generate new coaching analysis',
            instructions: {
                method: 'POST',
                endpoint: '/api/ai/coaching',
                body: {},
            },
        });
    } catch (error: any) {
        logError(error, 'GET /api/ai/coaching');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
