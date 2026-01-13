// File: src/app/api/ai/analyze-patterns/route.ts
// FINAL VERSION - Fixed TypeScript types

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { getMistakeStats } from '@/lib/gemini/mistake-rules';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

async function generatePatternAnalysis(trades: TradeData[]) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: TradeData) => t.pnl && t.pnl > 0);
    const losingTrades = trades.filter((t: TradeData) => t.pnl && t.pnl < 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades * 100).toFixed(1) : '0';
    
    const tradesData = trades.slice(0, 20).map((t: TradeData) => ({
      symbol: t.symbol,
      type: t.trade_type,
      pnl: t.pnl,
      status: t.status,
      emotions: t.emotions,
      tags: t.tags,
      reason: t.reason
    }));

    const prompt = `Analyze these trading patterns and provide insights in JSON format.

Statistics:
- Total: ${totalTrades}
- Winning: ${winningTrades.length}
- Losing: ${losingTrades.length}
- Win Rate: ${winRate}%

Recent Trades:
${JSON.stringify(tradesData, null, 2)}

Provide analysis in this EXACT JSON format:
{
  "patterns_identified": [
    {"pattern_type": "winning_setup", "description": "Pattern found", "frequency": 5, "impact": "positive", "recommendation": "Action"}
  ],
  "biggest_weakness": {
    "area": "risk_management",
    "description": "Main weakness",
    "frequency": "often",
    "improvement_plan": ["Step 1", "Step 2"]
  },
  "biggest_strength": {
    "area": "What you do best",
    "description": "Why",
    "how_to_leverage": "How to use more"
  },
  "common_mistakes": [
    {"mistake": "Common mistake", "occurrence_count": 5, "severity": "medium", "fix": "Solution"}
  ],
  "performance_insights": {
    "best_trading_time": "When",
    "best_setup_type": "Setup",
    "worst_setup_type": "Setup",
    "emotional_patterns": "Patterns"
  },
  "next_week_focus": ["Focus 1", "Focus 2"],
  "overall_assessment": "Assessment"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('Pattern Analysis Error:', error);
    return {
      patterns_identified: [],
      biggest_weakness: {
        area: "Unknown",
        description: "Unable to analyze",
        frequency: "N/A",
        improvement_plan: []
      },
      biggest_strength: {
        area: "Unknown",
        description: "Not enough data",
        how_to_leverage: "Continue trading"
      },
      common_mistakes: [],
      performance_insights: {
        best_trading_time: "Unknown",
        best_setup_type: "Unknown",
        worst_setup_type: "Unknown",
        emotional_patterns: "Unable to detect"
      },
      next_week_focus: [
        "Keep detailed logs",
        "Follow your plan",
        "Review weekly"
      ],
      overall_assessment: "AI unavailable. Continue building history."
    };
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { limit = 50, days = 30 } = body;

    console.log(`🔍 Analyzing patterns (${days} days, limit: ${limit})`);

    const supabase = createServiceClient();
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('entry_time', dateLimit.toISOString())
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (tradesError) {
      console.error('Trades error:', tradesError);
      throw tradesError;
    }

    if (!trades || trades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Not enough trades. Add at least 5 trades.',
        analysis: null
      });
    }

    console.log(`📊 Analyzing ${trades.length} trades`);

    // ✅ Fixed: Type assertion for compatibility
    const mistakeStats = getMistakeStats(trades as any);
    console.log('⚠️ Mistake stats calculated');

    console.log('🤖 Generating AI pattern analysis...');
    const patternAnalysis = await generatePatternAnalysis(trades);
    console.log('✅ Pattern analysis completed');

    const analysis = {
      analyzed_trades_count: trades.length,
      date_range: {
        from: dateLimit.toISOString(),
        to: new Date().toISOString()
      },
      mistake_statistics: mistakeStats,
      ai_insights: patternAnalysis,
      analyzed_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('❌ Pattern Analysis Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Pattern analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}