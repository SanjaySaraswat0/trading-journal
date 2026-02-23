// app/api/ai/predictive/route.ts
// Predictive Insights API - Forward-Looking Trading Recommendations
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { aiAnalysisRateLimit, aiFreeTierDailyLimit, aiProTierDailyLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logAI, logError } from '@/lib/logging/logger';
import { getUserTier } from '@/lib/rbac/middleware';
import { runCompletePatternAnalysis } from '@/lib/ai/pattern-detectors';
import { buildTraderProfile } from '@/lib/ai/coaching';
import { runCompletePredictiveAnalysis } from '@/lib/ai/predictive';

export async function POST(request: Request) {
    try {
        logApiRequest('POST', '/api/ai/predictive', undefined);

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            logger.warn('Unauthorized predictive request');
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

        // Check RBAC tier limits
        const supabase = createServiceClient();
        const { data: userData } = await supabase
            .from('trades')
            .select('user_id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

        const tier = getUserTier(userData);

        const tierLimiter = tier === 'free' ? aiFreeTierDailyLimit : aiProTierDailyLimit;
        if (tierLimiter) {
            const tierLimitResult = await rateLimitMiddleware(
                request,
                session.user.id,
                tierLimiter,
                {
                    blockMessage: `Daily AI predictive limit reached for ${tier} tier. ${tier === 'free' ? 'Upgrade to Pro for unlimited access.' : 'Please try again tomorrow.'}`,
                }
            );
            if (tierLimitResult) return tierLimitResult;
        }

        logger.info('Starting predictive analysis', { userId: session.user.id, tier });

        // Fetch trades (last 60 days for predictions)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 60);

        const { data: trades, error: fetchError } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('entry_time', cutoffDate.toISOString())
            .order('entry_time', { ascending: false })
            .limit(150);

        if (fetchError) {
            logError(fetchError, 'Predictive - trade fetch', { userId: session.user.id });
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!trades || trades.length < 15) {
            logger.info('Not enough trades for predictions', { userId: session.user.id, count: trades?.length || 0 });
            return NextResponse.json({
                success: false,
                message: 'Need at least 15 trades for meaningful predictions',
            }, { status: 400 });
        }

        logger.info('Running predictive analysis', { tradeCount: trades.length, userId: session.user.id });

        // Run pattern analysis first
        const patterns = runCompletePatternAnalysis(trades as any);
        const profile = buildTraderProfile(trades as any, patterns);

        // Run predictive analysis (100% FREE - pure logic)
        const predictions = runCompletePredictiveAnalysis(trades as any, patterns, profile);

        logAI('Predictive analysis completed', {
            userId: session.user.id,
            tradesAnalyzed: trades.length,
            bestHours: predictions.optimalSchedule.bestTradingHours.length,
            riskAlerts: predictions.riskAlerts.length,
        });

        return NextResponse.json({
            success: true,
            predictions: {
                optimalSchedule: predictions.optimalSchedule,
                setupPredictions: predictions.setupPredictions,
                positionSizing: predictions.positionSizing,
                riskAlerts: predictions.riskAlerts,
                overallRecommendation: predictions.overallRecommendation,
            },
            traderProfile: profile,
            tradesAnalyzed: trades.length,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        logError(error, 'POST /api/ai/predictive');
        return NextResponse.json({
            error: error.message || 'Predictive analysis failed',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }
}
