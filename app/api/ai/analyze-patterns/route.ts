// app/api/ai/analyze-patterns/route.ts
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { createPatternAnalysisPrompt } from '@/lib/gemini/prompts';
import { analyzePatternsSchema } from '@/lib/validation/schemas';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { aiAnalysisRateLimit, aiFreeTierDailyLimit, aiProTierDailyLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logAI, logError } from '@/lib/logging/logger';
import { getUserTier } from '@/lib/rbac/middleware';
import { getTierPermissions } from '@/lib/rbac/permissions';
import { ZodError } from 'zod';

// Direct REST call to v1 API — SDK routes to v1beta which doesn't support gemini-2.5-flash
async function callGeminiDirect(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  setup_type: string | null;
  reason: string | null;
  emotions: string[] | null;
  tags: string[] | null;
  timeframe: string | null;
}

async function analyzeWithAI(trades: Trade[]) {
  try {
    const prompt = createPatternAnalysisPrompt(trades as any);
    logAI('Sending pattern analysis to AI', { tradeCount: trades.length });

    const text = await callGeminiDirect(prompt);
    logger.info('AI pattern response received');

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (error: any) {
    logError(error, 'AI Pattern Analysis');
    return null;
  }
}

function calculateRuleBasedPatterns(trades: Trade[]) {
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);
  const winningTrades = closedTrades.filter((t) => t.pnl! > 0);
  const losingTrades = closedTrades.filter((t) => t.pnl! < 0);

  // Setup-wise performance
  const setupPerformance: any = {};
  closedTrades.forEach((trade) => {
    const setup = trade.setup_type || 'unknown';
    if (!setupPerformance[setup]) {
      setupPerformance[setup] = { wins: 0, losses: 0, totalPnL: 0 };
    }

    if (trade.pnl! > 0) {
      setupPerformance[setup].wins++;
    } else {
      setupPerformance[setup].losses++;
    }
    setupPerformance[setup].totalPnL += trade.pnl!;
  });

  // Find best and worst setup
  let bestSetup = { name: 'none', winRate: 0, pnl: 0 };
  let worstSetup = { name: 'none', winRate: 100, pnl: 0 };

  Object.entries(setupPerformance).forEach(([setup, stats]: [string, any]) => {
    const total = stats.wins + stats.losses;
    const winRate = (stats.wins / total) * 100;

    if (winRate > bestSetup.winRate && total >= 3) {
      bestSetup = { name: setup, winRate, pnl: stats.totalPnL };
    }

    if (winRate < worstSetup.winRate && total >= 3) {
      worstSetup = { name: setup, winRate, pnl: stats.totalPnL };
    }
  });

  // Time-based patterns
  const hourlyPerformance: any = {};
  closedTrades.forEach((trade) => {
    const hour = new Date(trade.entry_time).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { wins: 0, losses: 0, totalPnL: 0 };
    }

    if (trade.pnl! > 0) {
      hourlyPerformance[hour].wins++;
    } else {
      hourlyPerformance[hour].losses++;
    }
    hourlyPerformance[hour].totalPnL += trade.pnl!;
  });

  // Find best trading hour
  let bestHour = { hour: 10, winRate: 0, pnl: 0 };
  Object.entries(hourlyPerformance).forEach(([hour, stats]: [string, any]) => {
    const total = stats.wins + stats.losses;
    if (total >= 2) {
      const winRate = (stats.wins / total) * 100;
      if (winRate > bestHour.winRate) {
        bestHour = { hour: parseInt(hour), winRate, pnl: stats.totalPnL };
      }
    }
  });

  // Emotional patterns
  const emotionalPatterns: any = {};
  closedTrades.forEach((trade) => {
    if (trade.emotions && trade.emotions.length > 0) {
      trade.emotions.forEach((emotion) => {
        if (!emotionalPatterns[emotion]) {
          emotionalPatterns[emotion] = { wins: 0, losses: 0 };
        }
        if (trade.pnl! > 0) {
          emotionalPatterns[emotion].wins++;
        } else {
          emotionalPatterns[emotion].losses++;
        }
      });
    }
  });

  // Find most problematic emotion
  let worstEmotion = { name: 'none', winRate: 100 };
  Object.entries(emotionalPatterns).forEach(([emotion, stats]: [string, any]) => {
    const total = stats.wins + stats.losses;
    if (total >= 2) {
      const winRate = (stats.wins / total) * 100;
      if (winRate < worstEmotion.winRate) {
        worstEmotion = { name: emotion, winRate };
      }
    }
  });

  // Consecutive losses check
  let maxConsecutiveLosses = 0;
  let currentLossStreak = 0;

  closedTrades.forEach((trade) => {
    if (trade.pnl! < 0) {
      currentLossStreak++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  });

  return {
    setupPerformance,
    bestSetup,
    worstSetup,
    bestHour,
    worstEmotion,
    maxConsecutiveLosses,
    totalAnalyzed: closedTrades.length,
  };
}

// ✅ NEW: Calculate recovery rate (wins after losses)
function calculateRecoveryRate(trades: Trade[]) {
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);
  let recoveredAfterLoss = 0;
  let lossOccurrences = 0;

  for (let i = 1; i < closedTrades.length; i++) {
    if (closedTrades[i - 1].pnl! < 0) {
      lossOccurrences++;
      if (closedTrades[i].pnl! > 0) {
        recoveredAfterLoss++;
      }
    }
  }

  return lossOccurrences > 0 ? (recoveredAfterLoss / lossOccurrences) * 100 : 0;
}

// ✅ NEW: Detect revenge trading patterns
function detectRevengeTrades(trades: Trade[]) {
  const revengeTrades: any[] = [];
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);

  for (let i = 1; i < closedTrades.length; i++) {
    const prevTrade = closedTrades[i - 1];
    const currentTrade = closedTrades[i];

    // Only check after losses
    if (prevTrade.pnl! < 0 && prevTrade.exit_time && currentTrade.entry_time) {
      const timeDiff =
        (new Date(currentTrade.entry_time).getTime() -
          new Date(prevTrade.exit_time).getTime()) /
        1000 /
        60; // minutes

      // Entered within 30 minutes after a loss = potential revenge trade
      if (timeDiff < 30 && timeDiff > 0) {
        revengeTrades.push({
          tradeId: currentTrade.id,
          symbol: currentTrade.symbol,
          afterLoss: prevTrade.pnl,
          minutesAfter: Math.round(timeDiff),
          result: currentTrade.pnl,
        });
      }
    }
  }

  return revengeTrades;
}

// ✅ NEW: Calculate discipline score
function calculateDisciplineScore(trades: Trade[], revengeTrades: any[]) {
  let score = 100;
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);

  if (closedTrades.length === 0) return 0;

  // Deduct for revenge trades
  const revengePercentage = (revengeTrades.length / closedTrades.length) * 100;
  score -= revengePercentage * 0.5; // Max -50 points

  // Deduct for large losses (>3% of account assumed)
  const largeLosses = closedTrades.filter(
    (t) => t.pnl! < 0 && Math.abs(t.pnl!) > 1000
  ).length;
  const largeLossPercentage = (largeLosses / closedTrades.length) * 100;
  score -= largeLossPercentage * 0.3; // Max -30 points

  // Bonus for having setup documented
  const withSetup = closedTrades.filter((t) => t.setup_type).length;
  const setupPercentage = (withSetup / closedTrades.length) * 100;
  if (setupPercentage > 80) score += 10;

  // Bonus for having notes/reasons
  const withReason = closedTrades.filter((t) => t.reason).length;
  const reasonPercentage = (withReason / closedTrades.length) * 100;
  if (reasonPercentage > 70) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ✅ NEW: Day-of-week performance
function analyzeDayOfWeek(trades: Trade[]) {
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);
  const dayPerformance: any = {
    Monday: { wins: 0, losses: 0, totalPnL: 0 },
    Tuesday: { wins: 0, losses: 0, totalPnL: 0 },
    Wednesday: { wins: 0, losses: 0, totalPnL: 0 },
    Thursday: { wins: 0, losses: 0, totalPnL: 0 },
    Friday: { wins: 0, losses: 0, totalPnL: 0 },
  };

  closedTrades.forEach((trade) => {
    const dayOfWeek = new Date(trade.entry_time).toLocaleDateString('en-US', {
      weekday: 'long',
    });

    if (dayPerformance[dayOfWeek]) {
      if (trade.pnl! > 0) {
        dayPerformance[dayOfWeek].wins++;
      } else {
        dayPerformance[dayOfWeek].losses++;
      }
      dayPerformance[dayOfWeek].totalPnL += trade.pnl!;
    }
  });

  // Find best and worst day
  let bestDay = { day: 'Monday', winRate: 0, pnl: 0 };
  let worstDay = { day: 'Monday', winRate: 100, pnl: 0 };

  Object.entries(dayPerformance).forEach(([day, stats]: [string, any]) => {
    const total = stats.wins + stats.losses;
    if (total >= 2) {
      const winRate = (stats.wins / total) * 100;

      if (winRate > bestDay.winRate) {
        bestDay = { day, winRate, pnl: stats.totalPnL };
      }

      if (winRate < worstDay.winRate) {
        worstDay = { day, winRate, pnl: stats.totalPnL };
      }
    }
  });

  return { dayPerformance, bestDay, worstDay };
}

// ✅ NEW: Find worst trading hour
function findWorstHour(trades: Trade[]) {
  const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);
  const hourlyPerformance: any = {};

  closedTrades.forEach((trade) => {
    const hour = new Date(trade.entry_time).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { wins: 0, losses: 0, totalPnL: 0 };
    }

    if (trade.pnl! > 0) {
      hourlyPerformance[hour].wins++;
    } else {
      hourlyPerformance[hour].losses++;
    }
    hourlyPerformance[hour].totalPnL += trade.pnl!;
  });

  let worstHour = { hour: 10, winRate: 100, pnl: 0 };
  Object.entries(hourlyPerformance).forEach(([hour, stats]: [string, any]) => {
    const total = stats.wins + stats.losses;
    if (total >= 2) {
      const winRate = (stats.wins / total) * 100;
      if (winRate < worstHour.winRate) {
        worstHour = {
          hour: parseInt(hour),
          winRate,
          pnl: stats.totalPnL,
        };
      }
    }
  });

  return worstHour;
}

// ✅ NEW: Generate actionable recommendations
function generateRecommendations(analysis: any) {
  const recommendations: any[] = [];

  // Worst setup recommendation
  if (analysis.worstSetup.winRate < 40 && analysis.worstSetup.name !== 'none') {
    recommendations.push({
      priority: 'high',
      category: 'Strategy',
      action: `Avoid "${analysis.worstSetup.name}" setup`,
      reason: `Only ${analysis.worstSetup.winRate.toFixed(1)}% win rate, losing ₹${Math.abs(analysis.worstSetup.pnl).toFixed(0)}`,
      impact: 'High - Could prevent significant losses',
      difficulty: 'Easy',
    });
  }

  // Worst time recommendation
  if (analysis.worstHour.winRate < 35) {
    recommendations.push({
      priority: 'medium',
      category: 'Timing',
      action: `Avoid trading at ${String(analysis.worstHour.hour).padStart(2, '0')}:00`,
      reason: `Worst hour - ${analysis.worstHour.winRate.toFixed(1)}% win rate`,
      impact: 'Medium',
      difficulty: 'Easy',
    });
  }

  // Emotional pattern recommendation
  if (
    analysis.worstEmotion.winRate < 45 &&
    analysis.worstEmotion.name !== 'none'
  ) {
    recommendations.push({
      priority: 'high',
      category: 'Psychology',
      action: `Don't trade when feeling "${analysis.worstEmotion.name}"`,
      reason: `Only ${analysis.worstEmotion.winRate.toFixed(1)}% success rate`,
      impact: 'High',
      difficulty: 'Medium',
    });
  }

  // Discipline score recommendation
  if (analysis.disciplineScore < 70) {
    recommendations.push({
      priority: 'critical',
      category: 'Discipline',
      action: 'Improve trade discipline and planning',
      reason: `Discipline score: ${analysis.disciplineScore}/100`,
      impact: 'Critical - Affects all trades',
      difficulty: 'Medium',
    });
  }

  // Revenge trading recommendation
  if (analysis.revengeTrades.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Psychology',
      action: 'Wait at least 30 minutes after a loss before next trade',
      reason: `${analysis.revengeTrades.length} potential revenge trades detected`,
      impact: 'High',
      difficulty: 'Medium',
    });
  }

  // Loss streak recommendation
  if (analysis.maxConsecutiveLosses >= 5) {
    recommendations.push({
      priority: 'high',
      category: 'Risk Management',
      action: 'Set max daily loss limit and stop trading after 3 consecutive losses',
      reason: `Max loss streak: ${analysis.maxConsecutiveLosses} trades`,
      impact: 'High',
      difficulty: 'Easy',
    });
  }

  // Day-based recommendation
  if (analysis.worstDay && analysis.worstDay.winRate < 35) {
    recommendations.push({
      priority: 'medium',
      category: 'Timing',
      action: `Reduce trading on ${analysis.worstDay.day}s or be extra cautious`,
      reason: `Worst day - ${analysis.worstDay.winRate.toFixed(1)}% win rate`,
      impact: 'Medium',
      difficulty: 'Easy',
    });
  }

  // Sort by priority
  const priorityOrder: any = { critical: 4, high: 3, medium: 2, low: 1 };
  return recommendations.sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  );
}


export async function POST(request: Request) {
  try {
    logApiRequest('POST', '/api/ai/analyze-patterns', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized pattern analysis attempt');
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

    if (!process.env.GEMINI_API_KEY) {
      logger.error('Gemini API key not configured');
      return NextResponse.json({
        error: 'Gemini API key not configured',
      }, { status: 500 });
    }

    const body = await request.json();

    // Validate input
    let validatedData;
    try {
      validatedData = analyzePatternsSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn('Pattern analysis validation failed', { errors: err.issues, userId: session.user.id });
        return NextResponse.json(
          { error: 'Validation failed', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const { limit, days } = validatedData;

    // Check RBAC tier limits for AI usage
    const supabase = createServiceClient();
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

    logger.info('Starting pattern analysis', { limit, days, userId: session.user.id, tier });

    // Fetch trades
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: trades, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('entry_time', cutoffDate.toISOString())
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (fetchError) {
      logError(fetchError, 'Pattern analysis - trade fetch', { userId: session.user.id });
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!trades || trades.length === 0) {
      logger.info('Not enough trades for pattern analysis', { userId: session.user.id });
      return NextResponse.json({
        success: false,
        message: 'Not enough trades to analyze',
      });
    }

    logger.info('Found trades for pattern analysis', { count: trades.length, userId: session.user.id });

    // Calculate rule-based patterns
    console.log('🔍 Calculating rule-based patterns...');
    const ruleBasedPatterns = calculateRuleBasedPatterns(trades as any);
    console.log('✅ Rule-based patterns calculated');

    // ✅ Calculate new advanced metrics
    console.log('📊 Calculating advanced metrics...');
    const recoveryRate = calculateRecoveryRate(trades as any);
    const revengeTrades = detectRevengeTrades(trades as any);
    const disciplineScore = calculateDisciplineScore(trades as any, revengeTrades);
    const dayAnalysis = analyzeDayOfWeek(trades as any);
    const worstHour = findWorstHour(trades as any);

    // Combine all analytics
    const combinedAnalysis = {
      ...ruleBasedPatterns,
      recoveryRate,
      revengeTrades,
      disciplineScore,
      ...dayAnalysis,
      worstHour,
    };

    // Generate recommendations based on all data
    const recommendations = generateRecommendations(combinedAnalysis);
    console.log(`✅ Generated ${recommendations.length} recommendations`);

    // Get AI analysis
    console.log('🤖 Getting AI insights...');
    const aiInsights = await analyzeWithAI(trades as any);

    const analysis = {
      user_id: session.user.id,
      analyzed_at: new Date().toISOString(),
      trades_analyzed: trades.length,
      rule_based_patterns: ruleBasedPatterns,
      ai_insights: aiInsights,

      // ✅ NEW: Advanced metrics
      recovery_rate: recoveryRate,
      revenge_trades: revengeTrades,
      discipline_score: disciplineScore,
      day_analysis: dayAnalysis,
      worst_hour: worstHour,
      recommendations: recommendations,

      summary: {
        total_trades: trades.length,
        best_setup: ruleBasedPatterns.bestSetup.name,
        worst_setup: ruleBasedPatterns.worstSetup.name,
        best_trading_hour: `${ruleBasedPatterns.bestHour.hour}:00`,
        max_losing_streak: ruleBasedPatterns.maxConsecutiveLosses,
        // New summary fields
        recovery_rate: recoveryRate.toFixed(1) + '%',
        discipline_score: disciplineScore,
        best_day: dayAnalysis.bestDay.day,
        worst_day: dayAnalysis.worstDay.day,
      },
    };

    // Save to database
    try {
      await supabase
        .from('trade_analyses')
        .insert({
          trade_id: trades[0].id,
          user_id: session.user.id,
          ai_analysis: analysis,
        });
      console.log('💾 Analysis saved to database');
    } catch (saveError: any) {
      console.warn('⚠️ Could not save pattern analysis:', saveError.message);
    }

    console.log('🟢 === PATTERN ANALYSIS COMPLETED ===\n');

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error: any) {
    console.error('❌ Pattern Analysis Error:', error);
    return NextResponse.json({
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('trade_analyses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({
        success: true,
        analysis: null,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: data?.analysis_data || null,
    });

  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}

