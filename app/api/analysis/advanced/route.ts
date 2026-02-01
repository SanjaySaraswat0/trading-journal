// app/api/analysis/advanced/route.ts
// ADVANCED AI-POWERED ANALYSIS SYSTEM

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  quantity: number;
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

// Advanced pattern detection
function detectAdvancedPatterns(trades: Trade[]) {
  const closedTrades = trades.filter(t => t.exit_price && t.pnl !== null);
  const winningTrades = closedTrades.filter(t => t.pnl! > 0);
  const losingTrades = closedTrades.filter(t => t.pnl! < 0);
  
  // 1. TIME-BASED MISTAKE ANALYSIS
  const hourlyMistakes: any = {};
  const hourlyPerformance: any = {};
  
  trades.forEach(trade => {
    const hour = new Date(trade.entry_time).getHours();
    
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = {
        wins: 0,
        losses: 0,
        totalPnL: 0,
        trades: [],
        mistakes: []
      };
    }
    
    if (trade.pnl !== null && trade.exit_price) {
      if (trade.pnl > 0) {
        hourlyPerformance[hour].wins++;
      } else {
        hourlyPerformance[hour].losses++;
      }
      hourlyPerformance[hour].totalPnL += trade.pnl;
      hourlyPerformance[hour].trades.push(trade.symbol);
    }
    
    // Detect mistakes per hour
    if (!trade.stop_loss) hourlyPerformance[hour].mistakes.push('No Stop Loss');
    if (!trade.target_price) hourlyPerformance[hour].mistakes.push('No Target');
    if (!trade.reason || trade.reason === 'Imported from Excel') {
      hourlyPerformance[hour].mistakes.push('No Reason');
    }
  });
  
  // Find worst trading hours (most mistakes + losses)
  const worstHours = Object.entries(hourlyPerformance)
    .filter(([hour, stats]: [string, any]) => stats.trades.length >= 2)
    .map(([hour, stats]: [string, any]) => ({
      hour: parseInt(hour),
      winRate: stats.wins + stats.losses > 0 
        ? (stats.wins / (stats.wins + stats.losses) * 100) 
        : 0,
      mistakes: stats.mistakes.length,
      pnl: stats.totalPnL,
      tradeCount: stats.trades.length
    }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);
  
  // 2. SETUP-WISE MISTAKE DETECTION
  const setupAnalysis: any = {};
  
  closedTrades.forEach(trade => {
    const setup = trade.setup_type || 'unknown';
    if (!setupAnalysis[setup]) {
      setupAnalysis[setup] = {
        wins: 0,
        losses: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        trades: [],
        mistakes: {
          noStopLoss: 0,
          noTarget: 0,
          poorRR: 0,
          noReason: 0
        }
      };
    }
    
    if (trade.pnl! > 0) {
      setupAnalysis[setup].wins++;
    } else {
      setupAnalysis[setup].losses++;
    }
    setupAnalysis[setup].totalPnL += trade.pnl!;
    setupAnalysis[setup].trades.push({
      symbol: trade.symbol,
      pnl: trade.pnl
    });
    
    // Count mistakes per setup
    if (!trade.stop_loss) setupAnalysis[setup].mistakes.noStopLoss++;
    if (!trade.target_price) setupAnalysis[setup].mistakes.noTarget++;
    if (!trade.reason || trade.reason === 'Imported from Excel') {
      setupAnalysis[setup].mistakes.noReason++;
    }
    
    // Check Risk-Reward
    if (trade.stop_loss && trade.target_price) {
      const risk = Math.abs(trade.entry_price - trade.stop_loss);
      const reward = Math.abs(trade.target_price - trade.entry_price);
      if (risk > 0 && reward / risk < 1.5) {
        setupAnalysis[setup].mistakes.poorRR++;
      }
    }
  });
  
  // Calculate avg win/loss per setup
  Object.keys(setupAnalysis).forEach(setup => {
    const stats = setupAnalysis[setup];
    const wins = stats.trades.filter((t: any) => t.pnl > 0);
    const losses = stats.trades.filter((t: any) => t.pnl < 0);
    
    stats.avgWin = wins.length > 0 
      ? wins.reduce((sum: number, t: any) => sum + t.pnl, 0) / wins.length 
      : 0;
    stats.avgLoss = losses.length > 0 
      ? Math.abs(losses.reduce((sum: number, t: any) => sum + t.pnl, 0) / losses.length)
      : 0;
  });
  
  // 3. EMOTIONAL PATTERN DETECTION
  const emotionalPatterns: any = {};
  
  trades.forEach(trade => {
    if (trade.emotions && trade.emotions.length > 0) {
      trade.emotions.forEach(emotion => {
        if (!emotionalPatterns[emotion]) {
          emotionalPatterns[emotion] = {
            count: 0,
            wins: 0,
            losses: 0,
            trades: []
          };
        }
        
        emotionalPatterns[emotion].count++;
        if (trade.pnl !== null && trade.exit_price) {
          if (trade.pnl > 0) {
            emotionalPatterns[emotion].wins++;
          } else {
            emotionalPatterns[emotion].losses++;
          }
          emotionalPatterns[emotion].trades.push({
            symbol: trade.symbol,
            pnl: trade.pnl
          });
        }
      });
    }
  });
  
  // 4. CONSECUTIVE LOSS PATTERN
  let maxLossStreak = 0;
  let currentLossStreak = 0;
  let lossStreakTrades: string[] = [];
  let currentStreakTrades: string[] = [];
  
  closedTrades.forEach(trade => {
    if (trade.pnl! < 0) {
      currentLossStreak++;
      currentStreakTrades.push(trade.symbol);
      if (currentLossStreak > maxLossStreak) {
        maxLossStreak = currentLossStreak;
        lossStreakTrades = [...currentStreakTrades];
      }
    } else {
      currentLossStreak = 0;
      currentStreakTrades = [];
    }
  });
  
  // 5. DAY-OF-WEEK ANALYSIS
  const dayOfWeekPerformance: any = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  closedTrades.forEach(trade => {
    const day = new Date(trade.entry_time).getDay();
    const dayName = dayNames[day];
    
    if (!dayOfWeekPerformance[dayName]) {
      dayOfWeekPerformance[dayName] = {
        wins: 0,
        losses: 0,
        totalPnL: 0,
        trades: []
      };
    }
    
    if (trade.pnl! > 0) {
      dayOfWeekPerformance[dayName].wins++;
    } else {
      dayOfWeekPerformance[dayName].losses++;
    }
    dayOfWeekPerformance[dayName].totalPnL += trade.pnl!;
    dayOfWeekPerformance[dayName].trades.push(trade.symbol);
  });
  
  // 6. RISK MANAGEMENT ANALYSIS
  const riskMetrics = {
    tradesWithoutStopLoss: trades.filter(t => !t.stop_loss).length,
    tradesWithoutTarget: trades.filter(t => !t.target_price).length,
    tradesWithoutReason: trades.filter(t => !t.reason || t.reason === 'Imported from Excel').length,
    poorRiskRewardTrades: 0,
    overLeveragedTrades: 0
  };
  
  trades.forEach(trade => {
    if (trade.stop_loss && trade.target_price) {
      const risk = Math.abs(trade.entry_price - trade.stop_loss);
      const reward = Math.abs(trade.target_price - trade.entry_price);
      if (risk > 0 && reward / risk < 1.5) {
        riskMetrics.poorRiskRewardTrades++;
      }
    }
    
    // Check position sizing (assuming max 10% per trade)
    const positionPct = (trade.entry_price * trade.quantity) / 100000; // Assuming $100k account
    if (positionPct > 0.1) {
      riskMetrics.overLeveragedTrades++;
    }
  });
  
  return {
    hourlyPerformance,
    worstHours,
    setupAnalysis,
    emotionalPatterns,
    lossStreak: {
      maxStreak: maxLossStreak,
      trades: lossStreakTrades
    },
    dayOfWeekPerformance,
    riskMetrics,
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length
  };
}

// Generate AI insights using Gemini
async function generateAIInsights(patterns: any, trades: Trade[]) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are an expert trading psychologist and analyst. Analyze this trader's performance data and provide deep, personalized insights.

TRADER STATISTICS:
- Total Trades: ${patterns.totalTrades}
- Closed Trades: ${patterns.closedTrades}
- Win Rate: ${((patterns.winningTrades / patterns.closedTrades) * 100).toFixed(1)}%
- Max Losing Streak: ${patterns.lossStreak.maxStreak} trades

WORST TRADING HOURS (Most Mistakes):
${patterns.worstHours.map((h: any) => 
  `- ${h.hour}:00 - Win Rate: ${h.winRate.toFixed(1)}%, Mistakes: ${h.mistakes}, Trades: ${h.tradeCount}`
).join('\n')}

SETUP PERFORMANCE:
${Object.entries(patterns.setupAnalysis).map(([setup, stats]: [string, any]) => 
  `- ${setup}: ${stats.wins}W/${stats.losses}L, Avg Win: $${stats.avgWin.toFixed(2)}, Avg Loss: $${stats.avgLoss.toFixed(2)}, Mistakes: ${JSON.stringify(stats.mistakes)}`
).join('\n')}

EMOTIONAL PATTERNS:
${Object.entries(patterns.emotionalPatterns).map(([emotion, stats]: [string, any]) => 
  `- ${emotion}: ${stats.count} times, Win Rate: ${stats.wins + stats.losses > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1) : 0}%`
).join('\n')}

RISK MANAGEMENT ISSUES:
- Trades without Stop Loss: ${patterns.riskMetrics.tradesWithoutStopLoss}
- Trades without Target: ${patterns.riskMetrics.tradesWithoutTarget}
- Poor Risk-Reward Trades: ${patterns.riskMetrics.poorRiskRewardTrades}
- Over-leveraged Trades: ${patterns.riskMetrics.overLeveragedTrades}

DAY OF WEEK PERFORMANCE:
${Object.entries(patterns.dayOfWeekPerformance).map(([day, stats]: [string, any]) => 
  `- ${day}: ${stats.wins}W/${stats.losses}L, P&L: $${stats.totalPnL.toFixed(2)}`
).join('\n')}

Provide analysis in this EXACT JSON format:
{
  "biggest_mistakes": [
    {
      "category": "RISK_MANAGEMENT | TIMING | PSYCHOLOGY | STRATEGY",
      "mistake": "Specific mistake description",
      "frequency": "How often this happens",
      "impact": "High | Medium | Low",
      "examples": ["Trade example 1", "Trade example 2"],
      "why_harmful": "Why this is a problem",
      "how_to_fix": "Detailed actionable steps to fix this"
    }
  ],
  "time_based_insights": {
    "worst_trading_hours": ["10:00", "14:00"],
    "best_trading_hours": ["11:00", "13:00"],
    "worst_days": ["Monday", "Friday"],
    "best_days": ["Tuesday", "Wednesday"],
    "recommendation": "When to trade and when to avoid"
  },
  "strongest_areas": [
    {
      "strength": "What you do well",
      "evidence": "Data that proves this",
      "how_to_leverage": "How to use this strength more"
    }
  ],
  "psychological_analysis": {
    "detected_patterns": ["Pattern 1", "Pattern 2"],
    "emotional_triggers": ["Trigger 1", "Trigger 2"],
    "mental_state_score": 7,
    "recommendations": ["Recommendation 1", "Recommendation 2"]
  },
  "setup_recommendations": {
    "avoid_setups": ["Setup to avoid"],
    "focus_on_setups": ["Setup to focus on"],
    "setup_improvement_plan": "Detailed plan"
  },
  "risk_management_grade": "A | B | C | D | F",
  "risk_management_issues": [
    {
      "issue": "Specific issue",
      "severity": "Critical | High | Medium | Low",
      "fix": "How to fix"
    }
  ],
  "next_30_days_plan": {
    "immediate_actions": ["Action 1", "Action 2", "Action 3"],
    "weekly_goals": ["Goal 1", "Goal 2"],
    "habits_to_build": ["Habit 1", "Habit 2"],
    "habits_to_break": ["Habit 1", "Habit 2"]
  },
  "personalized_message": "A motivational, personalized message for this trader based on their data"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('❌ AI generation error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('\n🔥 === ADVANCED AI ANALYSIS STARTED ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'Gemini API key not configured'
      }, { status: 500 });
    }
    
    const supabase = createServiceClient();
    
    // Fetch all trades
    console.log('📊 Fetching all trades...');
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_time', { ascending: false });
    
    if (tradesError) {
      console.error('❌ Fetch error:', tradesError);
      return NextResponse.json({ error: tradesError.message }, { status: 500 });
    }
    
    if (!trades || trades.length < 5) {
      return NextResponse.json({
        success: false,
        message: `Need at least 5 trades for advanced analysis. You have ${trades?.length || 0}.`
      });
    }
    
    console.log(`✅ Analyzing ${trades.length} trades`);
    
    // Detect advanced patterns
    console.log('🔍 Detecting advanced patterns...');
    const patterns = detectAdvancedPatterns(trades as any);
    console.log('✅ Patterns detected');
    
    // Generate AI insights
    console.log('🤖 Generating AI insights...');
    const aiInsights = await generateAIInsights(patterns, trades as any);
    console.log('✅ AI insights generated');
    
    const analysis = {
      user_id: session.user.id,
      analyzed_at: new Date().toISOString(),
      trades_analyzed: trades.length,
      patterns,
      ai_insights: aiInsights,
      summary: {
        total_trades: patterns.totalTrades,
        closed_trades: patterns.closedTrades,
        win_rate: ((patterns.winningTrades / patterns.closedTrades) * 100).toFixed(1),
        worst_hours: patterns.worstHours.map((h: any) => `${h.hour}:00`),
        max_losing_streak: patterns.lossStreak.maxStreak,
        biggest_risk_issue: patterns.riskMetrics.tradesWithoutStopLoss > patterns.totalTrades * 0.3 
          ? 'No Stop Loss' 
          : patterns.riskMetrics.tradesWithoutTarget > patterns.totalTrades * 0.3
          ? 'No Target Price'
          : 'Good Risk Management'
      }
    };
    
    // Save to database using trade_analyses table (existing table)
    try {
      await supabase
        .from('trade_analyses')
        .insert({
          user_id: session.user.id,
          trade_id: trades[0]?.id || '', // Use first trade ID as reference
          ai_analysis: analysis,
          mistakes_detected: aiInsights?.biggest_mistakes?.map((m: any) => m.mistake) || [],
          patterns_identified: patterns.worstHours.map((h: any) => `Worst hour: ${h.hour}:00`) || [],
          confidence_score: 0.95
        });
      console.log('💾 Analysis saved to trade_analyses');
    } catch (saveError: any) {
      console.warn('⚠️ Save warning:', saveError.message);
    }
    
    console.log('🔥 === ADVANCED AI ANALYSIS COMPLETED ===\n');
    
    return NextResponse.json({
      success: true,
      analysis
    });
    
  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    // Get latest advanced analysis from trade_analyses table
    const { data, error } = await supabase
      .from('trade_analyses')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('analysis_type', 'advanced_patterns')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      analysis: data?.ai_analysis || null
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}