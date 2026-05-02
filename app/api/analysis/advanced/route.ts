// app/api/analysis/advanced/route.ts
// ADVANCED AI-POWERED ANALYSIS SYSTEM

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function callGeminiDirect(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }),
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e.substring(0, 200)}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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

// ─── Helper: compute per-day and per-weekday aggregations ───────────────────
function buildDailyBreakdown(trades: Trade[]) {
  const closed = trades.filter(t => t.exit_price && t.pnl !== null);

  // Per calendar date
  const byDate: Record<string, { date: string; wins: number; losses: number; pnl: number; tradeCount: number; symbols: string[] }> = {};
  closed.forEach(t => {
    const date = new Date(t.entry_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    if (!byDate[date]) byDate[date] = { date, wins: 0, losses: 0, pnl: 0, tradeCount: 0, symbols: [] };
    byDate[date].tradeCount++;
    byDate[date].pnl += t.pnl!;
    byDate[date].symbols.push(t.symbol);
    if (t.pnl! > 0) byDate[date].wins++; else byDate[date].losses++;
  });

  // All trades (including open) — per day for overtrading
  const allByDate: Record<string, number> = {};
  trades.forEach(t => {
    const date = new Date(t.entry_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    allByDate[date] = (allByDate[date] || 0) + 1;
  });

  const overtradingDays = Object.entries(allByDate)
    .filter(([, count]) => count >= 4)
    .map(([date, count]) => ({ date, count }));

  const sortedDates = Object.values(byDate).sort((a, b) => b.pnl - a.pnl);
  const bestDays = sortedDates.slice(0, 3);
  const worstDays = [...sortedDates].reverse().slice(0, 3);

  return { byDate: Object.values(byDate), overtradingDays, bestDays, worstDays };
}

function detectAdvancedPatterns(trades: Trade[]) {
  const closedTrades = trades.filter(t => t.exit_price && t.pnl !== null);
  const winningTrades = closedTrades.filter(t => t.pnl! > 0);
  const losingTrades = closedTrades.filter(t => t.pnl! < 0);

  // 1. TIME-BASED MISTAKE ANALYSIS
  const hourlyPerformance: any = {};

  trades.forEach(trade => {
    const hour = new Date(trade.entry_time).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { wins: 0, losses: 0, totalPnL: 0, trades: [], mistakes: [] };
    }
    if (trade.pnl !== null && trade.exit_price) {
      if (trade.pnl > 0) hourlyPerformance[hour].wins++;
      else hourlyPerformance[hour].losses++;
      hourlyPerformance[hour].totalPnL += trade.pnl;
      hourlyPerformance[hour].trades.push(trade.symbol);
    }
    if (!trade.stop_loss) hourlyPerformance[hour].mistakes.push('No Stop Loss');
    if (!trade.target_price) hourlyPerformance[hour].mistakes.push('No Target');
    if (!trade.reason || trade.reason === 'Imported from Excel') {
      hourlyPerformance[hour].mistakes.push('No Reason');
    }
  });

  const worstHours = Object.entries(hourlyPerformance)
    .filter(([, stats]: [string, any]) => stats.trades.length >= 2)
    .map(([hour, stats]: [string, any]) => ({
      hour: parseInt(hour),
      winRate: stats.wins + stats.losses > 0 ? (stats.wins / (stats.wins + stats.losses) * 100) : 0,
      mistakes: stats.mistakes.length,
      pnl: stats.totalPnL,
      tradeCount: stats.trades.length
    }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);

  // 2. SETUP-WISE ANALYSIS
  const setupAnalysis: any = {};
  closedTrades.forEach(trade => {
    const setup = trade.setup_type || 'unknown';
    if (!setupAnalysis[setup]) {
      setupAnalysis[setup] = { wins: 0, losses: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, trades: [], mistakes: { noStopLoss: 0, noTarget: 0, poorRR: 0, noReason: 0 } };
    }
    if (trade.pnl! > 0) setupAnalysis[setup].wins++;
    else setupAnalysis[setup].losses++;
    setupAnalysis[setup].totalPnL += trade.pnl!;
    setupAnalysis[setup].trades.push({ symbol: trade.symbol, pnl: trade.pnl });
    if (!trade.stop_loss) setupAnalysis[setup].mistakes.noStopLoss++;
    if (!trade.target_price) setupAnalysis[setup].mistakes.noTarget++;
    if (!trade.reason || trade.reason === 'Imported from Excel') setupAnalysis[setup].mistakes.noReason++;
    if (trade.stop_loss && trade.target_price) {
      const risk = Math.abs(trade.entry_price - trade.stop_loss);
      const reward = Math.abs(trade.target_price - trade.entry_price);
      if (risk > 0 && reward / risk < 1.5) setupAnalysis[setup].mistakes.poorRR++;
    }
  });
  Object.keys(setupAnalysis).forEach(setup => {
    const stats = setupAnalysis[setup];
    const wins = stats.trades.filter((t: any) => t.pnl > 0);
    const losses = stats.trades.filter((t: any) => t.pnl < 0);
    stats.avgWin = wins.length > 0 ? wins.reduce((s: number, t: any) => s + t.pnl, 0) / wins.length : 0;
    stats.avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s: number, t: any) => s + t.pnl, 0) / losses.length) : 0;
  });

  // 3. EMOTIONAL PATTERNS
  const emotionalPatterns: any = {};
  trades.forEach(trade => {
    if (trade.emotions && trade.emotions.length > 0) {
      trade.emotions.forEach(emotion => {
        if (!emotionalPatterns[emotion]) emotionalPatterns[emotion] = { count: 0, wins: 0, losses: 0, trades: [] };
        emotionalPatterns[emotion].count++;
        if (trade.pnl !== null && trade.exit_price) {
          if (trade.pnl > 0) emotionalPatterns[emotion].wins++;
          else emotionalPatterns[emotion].losses++;
          emotionalPatterns[emotion].trades.push({ symbol: trade.symbol, pnl: trade.pnl });
        }
      });
    }
  });

  // 4. LOSS STREAKS
  let maxLossStreak = 0, currentLossStreak = 0;
  let lossStreakTrades: string[] = [], currentStreakTrades: string[] = [];
  closedTrades.forEach(trade => {
    if (trade.pnl! < 0) {
      currentLossStreak++; currentStreakTrades.push(trade.symbol);
      if (currentLossStreak > maxLossStreak) { maxLossStreak = currentLossStreak; lossStreakTrades = [...currentStreakTrades]; }
    } else { currentLossStreak = 0; currentStreakTrades = []; }
  });

  // 5. DAY OF WEEK
  const dayOfWeekPerformance: any = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  closedTrades.forEach(trade => {
    const dayName = dayNames[new Date(trade.entry_time).getDay()];
    if (!dayOfWeekPerformance[dayName]) dayOfWeekPerformance[dayName] = { wins: 0, losses: 0, totalPnL: 0, trades: [] };
    if (trade.pnl! > 0) dayOfWeekPerformance[dayName].wins++;
    else dayOfWeekPerformance[dayName].losses++;
    dayOfWeekPerformance[dayName].totalPnL += trade.pnl!;
    dayOfWeekPerformance[dayName].trades.push(trade.symbol);
  });

  // 6. RISK METRICS
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
      if (risk > 0 && reward / risk < 1.5) riskMetrics.poorRiskRewardTrades++;
    }
    if ((trade.entry_price * trade.quantity) / 100000 > 0.1) riskMetrics.overLeveragedTrades++;
  });

  return {
    hourlyPerformance, worstHours, setupAnalysis, emotionalPatterns,
    lossStreak: { maxStreak: maxLossStreak, trades: lossStreakTrades },
    dayOfWeekPerformance, riskMetrics,
    totalTrades: trades.length, closedTrades: closedTrades.length,
    winningTrades: winningTrades.length, losingTrades: losingTrades.length
  };
}

async function generateAIInsights(patterns: any, trades: Trade[], dailyBreakdown: ReturnType<typeof buildDailyBreakdown>) {
  try {
    // Format each trade compactly for Gemini
    const tradeLines = trades.map((t, i) => {
      const date = new Date(t.entry_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
      const time = new Date(t.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const pnl = t.pnl !== null ? `₹${t.pnl.toFixed(0)}` : 'open';
      const result = t.pnl !== null ? (t.pnl > 0 ? 'WIN' : 'LOSS') : 'OPEN';
      const emo = t.emotions?.join('/') || '-';
      const setup = t.setup_type || '-';
      const sl = t.stop_loss ? 'Y' : 'N';
      const tgt = t.target_price ? 'Y' : 'N';
      return `${i + 1}. [${date} ${time}] ${t.symbol} ${t.trade_type.toUpperCase()} → ${result} ${pnl} | Setup:${setup} SL:${sl} TGT:${tgt} Emo:${emo}`;
    }).join('\n');

    // Per-day summary
    const daySummaryLines = dailyBreakdown.byDate.map(d =>
      `  ${d.date}: ${d.tradeCount} trades, ${d.wins}W/${d.losses}L, P&L: ₹${d.pnl.toFixed(0)} [${d.symbols.join(',')}]`
    ).join('\n');

    // Overtrading alerts
    const overtradingLines = dailyBreakdown.overtradingDays.length > 0
      ? dailyBreakdown.overtradingDays.map(d => `  ${d.date}: ${d.count} trades (overtrading!)`).join('\n')
      : '  None detected';

    const winRate = patterns.closedTrades > 0
      ? ((patterns.winningTrades / patterns.closedTrades) * 100).toFixed(1)
      : '0';

    const prompt = `You are an expert Indian trading coach and psychologist. Analyze this trader's COMPLETE trade history and give SPECIFIC, DATA-DRIVEN insights. Be direct, honest, and practical. Reference actual dates, symbols, and numbers from the data.

TRADER OVERVIEW:
- Total Trades: ${patterns.totalTrades} | Closed: ${patterns.closedTrades} | Win Rate: ${winRate}%
- Max Losing Streak: ${patterns.lossStreak.maxStreak} trades (${patterns.lossStreak.trades.join(', ')})
- Trades without Stop Loss: ${patterns.riskMetrics.tradesWithoutStopLoss}/${patterns.totalTrades}
- Trades without Target: ${patterns.riskMetrics.tradesWithoutTarget}/${patterns.totalTrades}
- Trades without Reason documented: ${patterns.riskMetrics.tradesWithoutReason}/${patterns.totalTrades}

COMPLETE TRADE LIST (chronological, newest first):
${tradeLines}

PER-DATE SUMMARY:
${daySummaryLines}

OVERTRADING ALERTS (days with 4+ trades):
${overtradingLines}

SETUP PERFORMANCE:
${Object.entries(patterns.setupAnalysis).map(([setup, stats]: [string, any]) =>
      `- ${setup}: ${stats.wins}W/${stats.losses}L, AvgWin:₹${stats.avgWin.toFixed(0)}, AvgLoss:₹${stats.avgLoss.toFixed(0)}, P&L:₹${stats.totalPnL.toFixed(0)}`
    ).join('\n')}

EMOTIONAL DATA:
${Object.entries(patterns.emotionalPatterns).map(([emotion, stats]: [string, any]) =>
      `- ${emotion}: ${stats.count} trades, WinRate:${stats.wins + stats.losses > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0) : 0}%`
    ).join('\n') || '  No emotional data recorded'}

DAY-OF-WEEK:
${Object.entries(patterns.dayOfWeekPerformance).map(([day, stats]: [string, any]) =>
      `- ${day}: ${stats.wins}W/${stats.losses}L, P&L:₹${stats.totalPnL.toFixed(0)}`
    ).join('\n')}

WORST TRADING HOURS:
${patterns.worstHours.map((h: any) =>
      `- ${h.hour}:00 → WinRate:${h.winRate.toFixed(0)}%, Trades:${h.tradeCount}, Mistakes:${h.mistakes}`
    ).join('\n')}

Based on ALL the above data, provide a thorough, SPECIFIC analysis in this EXACT JSON format (no extra text, no markdown):
{
  "biggest_mistakes": [
    {
      "category": "RISK_MANAGEMENT | TIMING | PSYCHOLOGY | STRATEGY",
      "mistake": "Specific mistake description referencing actual data",
      "frequency": "e.g. Happened on 5 out of 10 days",
      "impact": "High | Medium | Low",
      "why_harmful": "Why this is hurting your account",
      "how_to_fix": "Specific, actionable steps to fix this",
      "examples": ["e.g. 24 Mar: entered NIFTY after losing ₹500, lost another ₹300"]
    }
  ],
  "daily_performance": [
    {
      "date": "24 Mar 26",
      "trades": 3,
      "wins": 2,
      "losses": 1,
      "pnl": 450,
      "verdict": "Good | Average | Bad | Overtrading",
      "note": "Short specific comment about this day"
    }
  ],
  "overtrading_alerts": [
    {
      "date": "DD Mon YY",
      "trade_count": 5,
      "message": "Specific comment about why this was overtrading and what happened"
    }
  ],
  "time_based_insights": {
    "worst_trading_hours": ["10:00"],
    "best_trading_hours": ["11:00"],
    "worst_days": ["Monday"],
    "best_days": ["Tuesday"],
    "recommendation": "Specific advice based on actual data"
  },
  "strongest_areas": [
    {
      "strength": "What you do well",
      "evidence": "Specific data supporting this",
      "how_to_leverage": "How to use this strength more"
    }
  ],
  "psychological_analysis": {
    "detected_patterns": ["e.g. Revenge trading detected on X dates"],
    "emotional_triggers": ["e.g. Fear leads to early exits"],
    "mental_state_score": 7,
    "recommendations": ["Specific recommendation"]
  },
  "setup_recommendations": {
    "avoid_setups": ["Setup name and why"],
    "focus_on_setups": ["Setup name and why it works for you"],
    "setup_improvement_plan": "Detailed plan based on actual setup data"
  },
  "risk_management_grade": "A | B | C | D | F",
  "risk_management_issues": [
    { "issue": "Specific issue with data reference", "severity": "Critical | High | Medium | Low", "fix": "Actionable fix" }
  ],
  "next_30_days_plan": {
    "immediate_actions": ["Do this from tomorrow"],
    "weekly_goals": ["Goal with specific measure"],
    "habits_to_build": ["New habit to adopt"],
    "habits_to_break": ["Bad habit to stop"]
  },
  "personalized_message": "A specific, encouraging message that references this trader's actual patterns and data — not generic advice"
}`;

    const text = await callGeminiDirect(prompt);
    console.log('📝 Gemini raw response length:', text.length);

    // Strip markdown code fences if present
    const stripped = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Try to find the outermost JSON object
    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
      } catch {
        // Try full stripped text
        try { return JSON.parse(stripped); } catch {}
      }
    }
    console.error('❌ Could not parse Gemini JSON. Raw text snippet:', text.slice(0, 300));
    return null;
  } catch (error: any) {
    console.error('❌ AI generation error:', error.message);
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

    // Build daily breakdown for Gemini
    console.log('📅 Building daily breakdown...');
    const dailyBreakdown = buildDailyBreakdown(trades as any);
    console.log(`✅ Daily breakdown: ${dailyBreakdown.byDate.length} days, ${dailyBreakdown.overtradingDays.length} overtrading days`);

    // Generate AI insights with full trade data
    console.log('🤖 Generating AI insights with full trade data...');
    const rawAiInsights = await generateAIInsights(patterns, trades as any, dailyBreakdown);
    console.log('✅ AI insights generated, null?', rawAiInsights === null);

    // Always ensure daily_performance and overtrading_alerts exist
    // (use server-computed values as fallback if Gemini didn't return them)
    const serverDailyPerf = dailyBreakdown.byDate.map(d => ({
      date: d.date,
      trades: d.tradeCount,
      wins: d.wins,
      losses: d.losses,
      pnl: Math.round(d.pnl),
      verdict: dailyBreakdown.overtradingDays.some((od: any) => od.date === d.date)
        ? 'Overtrading'
        : d.wins > d.losses ? 'Good' : d.losses > d.wins ? 'Bad' : 'Average',
      note: rawAiInsights?.daily_performance?.find((dp: any) => dp.date === d.date)?.note || ''
    }));

    const serverOvertradingAlerts = dailyBreakdown.overtradingDays.map((od: any) => ({
      date: od.date,
      trade_count: od.count,
      message: rawAiInsights?.overtrading_alerts?.find((a: any) => a.date === od.date)?.message
        || `${od.count} trades placed on this day — consider limiting to 3 max.`
    }));

    const aiInsights = rawAiInsights ? {
      ...rawAiInsights,
      daily_performance: serverDailyPerf,
      overtrading_alerts: serverOvertradingAlerts,
    } : {
      daily_performance: serverDailyPerf,
      overtrading_alerts: serverOvertradingAlerts,
    };


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

