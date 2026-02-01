// app/api/ai/analyze-patterns/route.ts
// Complete Pattern Analysis API with AI Integration

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createPatternAnalysisPrompt } from '@/lib/gemini/prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = createPatternAnalysisPrompt(trades as any);
    
    console.log('🤖 Sending pattern analysis to AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ AI response received');
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('❌ AI Analysis Error:', error);
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

export async function POST(request: Request) {
  try {
    console.log('\n🟢 === PATTERN ANALYSIS STARTED ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'Gemini API key not configured',
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { limit = 50, days = 30 } = body;
    
    console.log(`📊 Analyzing last ${limit} trades from ${days} days`);
    
    const supabase = createServiceClient();
    
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
      console.error('❌ Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!trades || trades.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Not enough trades to analyze',
      });
    }
    
    console.log(`✅ Found ${trades.length} trades to analyze`);
    
    // Calculate rule-based patterns
    console.log('🔍 Calculating rule-based patterns...');
    const ruleBasedPatterns = calculateRuleBasedPatterns(trades as any);
    console.log('✅ Rule-based patterns calculated');
    
    // Get AI analysis
    console.log('🤖 Getting AI insights...');
    const aiInsights = await analyzeWithAI(trades as any);
    
    const analysis = {
      user_id: session.user.id,
      analyzed_at: new Date().toISOString(),
      trades_analyzed: trades.length,
      rule_based_patterns: ruleBasedPatterns,
      ai_insights: aiInsights,
      summary: {
        total_trades: trades.length,
        best_setup: ruleBasedPatterns.bestSetup.name,
        worst_setup: ruleBasedPatterns.worstSetup.name,
        best_trading_hour: `${ruleBasedPatterns.bestHour.hour}:00`,
        max_losing_streak: ruleBasedPatterns.maxConsecutiveLosses,
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