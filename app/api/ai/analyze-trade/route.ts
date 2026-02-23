// File: src/app/api/ai/analyze-trade/route.ts
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { detectTradeMistakes } from '@/lib/gemini/mistake-rules';

import { analyzeTradeSchema } from '@/lib/validation/schemas';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { aiAnalysisRateLimit, aiFreeTierDailyLimit, aiProTierDailyLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logAI, logError } from '@/lib/logging/logger';
import { getUserTier } from '@/lib/rbac/middleware';
import { getTierPermissions, hasReachedLimit } from '@/lib/rbac/permissions';
import { ZodError } from 'zod';

async function callGeminiDirect(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e.substring(0,200)}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ✅ Fixed: Proper type definition
interface TradeData {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  quantity: number;
  position_size: number;
  pnl: number | null;
  pnl_percentage: number | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  timeframe: string | null;
  setup_type: string | null;
  reason: string | null;
  screenshot_url: string | null;
  emotions: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

async function generateAIAnalysis(trade: TradeData) {
  try {
    

    const prompt = `You are an expert trading analyst. Analyze this trade and provide insights in JSON format.

Trade Details:
- Symbol: ${trade.symbol}
- Type: ${trade.trade_type.toUpperCase()}
- Entry: ${trade.entry_price}
- Exit: ${trade.exit_price ? `${trade.exit_price}` : 'Open'}
- Stop Loss: ${trade.stop_loss ? `${trade.stop_loss}` : 'Not Set'}
- Target: ${trade.target_price ? `${trade.target_price}` : 'Not Set'}
- Quantity: ${trade.quantity}
- P&L: ${trade.pnl ? `${trade.pnl.toFixed(2)}` : 'N/A'}
- Status: ${trade.status}
- Reason: ${trade.reason || 'Not provided'}
- Emotions: ${trade.emotions?.join(', ') || 'None'}
- Tags: ${trade.tags?.join(', ') || 'None'}

Provide analysis in this EXACT JSON format:
{
  "mistakes": [
    {"type": "RISK_MANAGEMENT", "description": "Issue found", "severity": "high", "suggestion": "How to fix"}
  ],
  "strengths": [
    {"aspect": "What was good", "description": "Why", "recommendation": "Keep doing"}
  ],
  "emotional_analysis": {
    "detected_emotions": ["confidence"],
    "emotional_score": 7,
    "impact_on_trade": "Impact description",
    "suggestions": ["Suggestion 1"]
  },
  "risk_analysis": {
    "risk_reward_ratio": 2.5,
    "position_sizing": "appropriate",
    "stop_loss_quality": "good",
    "recommendations": ["Rec 1"]
  },
  "overall_rating": 7,
  "summary": "Trade summary"
}`;

    const text = await callGeminiDirect(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(text);
  } catch (error: any) {
    logError(error, 'AI Analysis Generation');
    return {
      mistakes: [],
      strengths: [],
      emotional_analysis: {
        detected_emotions: [],
        emotional_score: 5,
        impact_on_trade: "Unable to analyze",
        suggestions: []
      },
      risk_analysis: {
        risk_reward_ratio: 0,
        position_sizing: "unknown",
        stop_loss_quality: "unknown",
        recommendations: []
      },
      overall_rating: 5,
      summary: "AI analysis unavailable. Using rule-based detection only."
    };
  }
}

export async function POST(request: Request) {
  try {
    logApiRequest('POST', '/api/ai/analyze-trade', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized AI analysis attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      aiAnalysisRateLimit,
      { blockMessage: 'Too many AI analysis requests. Please slow down.' }
    );
    if (rateLimitResult) return rateLimitResult;

    if (!process.env.GEMINI_API_KEY) {
      logger.error('Gemini API key not configured');
      return NextResponse.json({
        error: 'Gemini API key not configured'
      }, { status: 500 });
    }

    const body = await request.json();

    // Validate input
    let validatedData;
    try {
      validatedData = analyzeTradeSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn('AI analysis validation failed', { errors: err.issues, userId: session.user.id });
        return NextResponse.json(
          { error: 'Validation failed', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const { tradeId } = validatedData;

    // Check RBAC tier limits for AI usage
    const supabase = createServiceClient();

    // Get user's tier from database or use default
    const { data: userData } = await supabase
      .from('trades')
      .select('user_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();

    const tier = getUserTier(userData);
    const tierPermissions = getTierPermissions(tier);

    // Check daily AI usage limit based on tier
    const tierLimiter = tier === 'free' ? aiFreeTierDailyLimit : aiProTierDailyLimit;
    if (tierLimiter) {
      const tierLimitResult = await rateLimitMiddleware(
        request,
        session.user.id,
        tierLimiter,
        { blockMessage: `Daily AI analysis limit reached for ${tier} tier. ${tier === 'free' ? 'Upgrade to Pro for more analyses.' : 'Please try again tomorrow.'}` }
      );
      if (tierLimitResult) return tierLimitResult;
    }

    logger.info('Starting AI analysis', { tradeId, userId: session.user.id, tier });

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', session.user.id)
      .single();

    if (tradeError || !trade) {
      logError(tradeError || new Error('Trade not found'), 'AI analysis - trade fetch', { tradeId, userId: session.user.id });
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    logger.info('Trade found for analysis', { symbol: trade.symbol, tradeId });

    const { data: allTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_time', { ascending: false })
      .limit(50);

    logger.info('Context trades fetched', { count: allTrades?.length || 0, tradeId });

    // ✅ Fixed: Type assertion for compatibility
    const ruleMistakes = detectTradeMistakes(trade as any, (allTrades || []) as any);
    logger.info('Rule-based mistakes detected', { count: ruleMistakes.length, tradeId });

    logAI('Generating AI analysis', { tradeId, symbol: trade.symbol });
    const aiAnalysis = await generateAIAnalysis(trade);
    logAI('AI analysis completed', { tradeId, rating: aiAnalysis.overall_rating });

    const combinedAnalysis = {
      trade_id: tradeId,
      rule_based_mistakes: ruleMistakes,
      ai_analysis: aiAnalysis,
      analyzed_at: new Date().toISOString(),
      total_mistakes_found: ruleMistakes.length + (aiAnalysis.mistakes?.length || 0)
    };

    try {
      await supabase
        .from('trade_analyses')
        .insert({
          trade_id: tradeId,
          user_id: session.user.id,
          ai_analysis: aiAnalysis,
          mistakes_detected: ruleMistakes.map((m: any) => m.id),
          patterns_identified: [],
          confidence_score: aiAnalysis.overall_rating || 0
        });
      logger.info('Analysis saved to database', { tradeId });
    } catch (saveError: any) {
      logger.warn('Could not save analysis', { error: saveError.message, tradeId });
    }

    return NextResponse.json({
      success: true,
      analysis: combinedAnalysis
    });

  } catch (error: any) {
    logError(error, 'POST /api/ai/analyze-trade');
    return NextResponse.json({
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('tradeId');

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('trade_analyses')
      .select('*')
      .eq('trade_id', tradeId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({
        success: true,
        analysis: null
      });
    }

    return NextResponse.json({
      success: true,
      analysis: data
    });

  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}


