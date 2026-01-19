// File: app/api/reports/weekly/route.ts
// ✅ AI-Powered Weekly Trading Report Generator - FIXED GEMINI INTEGRATION

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number | null;
  pnl?: number | null;
  pnl_percentage?: number | null;
  status: string;
  entry_time: string;
  exit_time?: string | null;
  setup_type?: string | null;
  reason?: string | null;
  stop_loss?: number | null;
  target_price?: number | null;
}

interface WeeklyStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  openTrades: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  bestSetup: string;
  worstSetup: string;
  profitFactor: number;
  avgRiskReward: number;
}

// Calculate weekly statistics
function calculateWeeklyStats(trades: Trade[]): WeeklyStats {
  const closedTrades = trades.filter(t => t.exit_price && t.pnl !== null);
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
  const openTrades = trades.filter(t => t.status === 'open');

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

  const avgWin = winningTrades.length > 0 
    ? totalWins / winningTrades.length 
    : 0;
  
  const avgLoss = losingTrades.length > 0 
    ? totalLosses / losingTrades.length 
    : 0;

  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.pnl || 0)) 
    : 0;

  const largestLoss = losingTrades.length > 0 
    ? Math.min(...losingTrades.map(t => t.pnl || 0)) 
    : 0;

  // Find best/worst setups
  const setupPerformance = new Map<string, { wins: number; losses: number; pnl: number }>();
  
  closedTrades.forEach(trade => {
    const setup = trade.setup_type || 'unknown';
    if (!setupPerformance.has(setup)) {
      setupPerformance.set(setup, { wins: 0, losses: 0, pnl: 0 });
    }
    const stats = setupPerformance.get(setup)!;
    if ((trade.pnl || 0) > 0) stats.wins++;
    else stats.losses++;
    stats.pnl += trade.pnl || 0;
  });

  let bestSetup = 'None';
  let worstSetup = 'None';
  let bestPnL = -Infinity;
  let worstPnL = Infinity;

  setupPerformance.forEach((stats, setup) => {
    if (stats.pnl > bestPnL) {
      bestPnL = stats.pnl;
      bestSetup = setup;
    }
    if (stats.pnl < worstPnL) {
      worstPnL = stats.pnl;
      worstSetup = setup;
    }
  });

  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

  // Calculate avg risk-reward
  const tradesWithRR = closedTrades.filter(t => 
    t.stop_loss && t.target_price && t.entry_price
  );
  
  const avgRiskReward = tradesWithRR.length > 0
    ? tradesWithRR.reduce((sum, t) => {
        const risk = Math.abs(t.entry_price - (t.stop_loss || 0));
        const reward = Math.abs((t.target_price || 0) - t.entry_price);
        return sum + (risk > 0 ? reward / risk : 0);
      }, 0) / tradesWithRR.length
    : 0;

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    openTrades: openTrades.length,
    totalPnL,
    avgWin,
    avgLoss,
    winRate,
    largestWin,
    largestLoss,
    bestSetup,
    worstSetup,
    profitFactor,
    avgRiskReward,
  };
}

// Detect common mistakes
function detectMistakes(trades: Trade[]): string[] {
  const mistakes: string[] = [];

  // No stop loss
  const noStopLoss = trades.filter(t => !t.stop_loss).length;
  if (noStopLoss > trades.length * 0.3) {
    mistakes.push(`${noStopLoss} trades without stop loss - High risk!`);
  }

  // Overtrading
  if (trades.length > 20) {
    mistakes.push(`${trades.length} trades this week - Possible overtrading`);
  }

  // Large losses
  const largeLosses = trades.filter(t => 
    t.pnl && t.pnl < -1000
  ).length;
  if (largeLosses > 0) {
    mistakes.push(`${largeLosses} large losses detected - Review risk management`);
  }

  // Low win rate with high frequency
  const closedTrades = trades.filter(t => t.exit_price);
  if (closedTrades.length > 5) {
    const winRate = (trades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100;
    if (winRate < 40) {
      mistakes.push(`Win rate ${winRate.toFixed(1)}% - Below recommended 50%`);
    }
  }

  // Revenge trading pattern (quick trades after loss)
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
  );

  for (let i = 1; i < sortedTrades.length; i++) {
    const prev = sortedTrades[i - 1];
    const curr = sortedTrades[i];
    
    if (prev.pnl && prev.pnl < 0 && curr.entry_time) {
      const timeDiff = new Date(curr.entry_time).getTime() - new Date(prev.entry_time).getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff < 30) {
        mistakes.push('Possible revenge trading detected - trades taken too quickly after losses');
        break;
      }
    }
  }

  return mistakes;
}

// Generate AI insights using Gemini - FIXED VERSION
async function generateAIInsights(
  stats: WeeklyStats, 
  trades: Trade[], 
  mistakes: string[]
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not configured');
      return "AI insights unavailable - Gemini API key not configured.";
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ FIX: Use correct model name - try these in order
    // Option 1: gemini-1.5-flash (fastest, recommended for production)
    // Option 2: gemini-1.5-pro-latest (more capable)
    // Option 3: gemini-pro (older but stable)
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash'  // ✅ CHANGED FROM gemini-1.5-pro
    });

    const prompt = `
You are an expert trading coach analyzing a trader's weekly performance. Provide actionable insights.

WEEKLY STATISTICS:
- Total Trades: ${stats.totalTrades}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Total P&L: $${stats.totalPnL.toFixed(2)}
- Average Win: $${stats.avgWin.toFixed(2)}
- Average Loss: $${stats.avgLoss.toFixed(2)}
- Profit Factor: ${stats.profitFactor.toFixed(2)}
- Best Setup: ${stats.bestSetup}
- Worst Setup: ${stats.worstSetup}
- Largest Win: $${stats.largestWin.toFixed(2)}
- Largest Loss: $${stats.largestLoss.toFixed(2)}
- Average R:R Ratio: ${stats.avgRiskReward.toFixed(2)}

DETECTED MISTAKES:
${mistakes.length > 0 ? mistakes.map(m => `- ${m}`).join('\n') : '- None detected'}

SAMPLE TRADES:
${trades.slice(0, 5).map(t => 
  `- ${t.symbol} ${t.trade_type}: Entry $${t.entry_price}, Exit ${t.exit_price ? '$' + t.exit_price : 'Open'}, P&L: ${t.pnl ? '$' + t.pnl.toFixed(2) : 'N/A'}`
).join('\n')}

Provide a concise weekly report with:
1. Performance Summary (2-3 sentences)
2. Key Strengths (2-3 bullet points)
3. Areas for Improvement (2-3 bullet points)
4. Actionable Recommendations for Next Week (3-4 specific actions)

Keep it motivating but honest. Focus on data-driven insights.
`;

    console.log('🤖 Generating AI insights with Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ AI insights generated successfully');
    return text;

  } catch (error: any) {
    console.error('❌ Gemini API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    
    // Return a helpful fallback message
    return `
**Performance Summary**
This week you completed ${stats.totalTrades} trades with a win rate of ${stats.winRate.toFixed(1)}% and total P&L of $${stats.totalPnL.toFixed(2)}.

**Key Strengths**
- ${stats.bestSetup !== 'None' ? `Best performing setup: ${stats.bestSetup}` : 'Consistent risk management'}
- ${stats.profitFactor > 1 ? `Good profit factor of ${stats.profitFactor.toFixed(2)}` : 'Disciplined trade execution'}

**Areas for Improvement**
${mistakes.length > 0 ? mistakes.map(m => `- ${m}`).join('\n') : '- Continue monitoring risk management\n- Track emotional state before trades'}

**Recommendations for Next Week**
- ${stats.winRate < 50 ? 'Focus on quality over quantity - reduce trade frequency' : 'Maintain current trading discipline'}
- ${stats.avgRiskReward < 1.5 ? 'Improve risk-reward ratio - aim for 1:2 minimum' : 'Continue good risk-reward management'}
- Review and journal your best trades this week
- ${mistakes.length > 2 ? 'Address identified mistakes before taking new trades' : 'Keep following your trading plan'}

*Note: AI insights temporarily unavailable. This is a rule-based analysis.*
    `.trim();
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    // Default to current week if no dates provided
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();

    if (!startDate) {
      // Set to start of current week (Monday)
      start.setDate(start.getDate() - start.getDay() + 1);
      start.setHours(0, 0, 0, 0);
    }

    if (!endDate) {
      // Set to end of current week (Sunday)
      end.setDate(end.getDate() - end.getDay() + 7);
      end.setHours(23, 59, 59, 999);
    }

    console.log(`📊 Generating weekly report: ${start.toISOString()} to ${end.toISOString()}`);

    const supabase = createServiceClient();

    // Fetch trades for the week
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('entry_time', start.toISOString())
      .lte('entry_time', end.toISOString())
      .order('entry_time', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!trades || trades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No trades found for this week',
        stats: null,
        aiInsights: 'No trading activity this week. Consider planning your trades for next week.',
        mistakes: [],
        recommendations: [
          'Review your trading plan',
          'Prepare watchlist for next week',
          'Study market conditions',
        ],
      });
    }

    // Calculate statistics
    const stats = calculateWeeklyStats(trades);

    // Detect mistakes
    const mistakes = detectMistakes(trades);

    // Generate AI insights
    const aiInsights = await generateAIInsights(stats, trades, mistakes);

    console.log(`✅ Report generated: ${trades.length} trades analyzed`);

    return NextResponse.json({
      success: true,
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      stats,
      mistakes,
      aiInsights,
      totalTrades: trades.length,
      recommendations: [
        stats.winRate < 50 ? 'Focus on quality over quantity - reduce trade frequency' : 'Maintain current trading frequency',
        stats.avgRiskReward < 1.5 ? 'Improve risk-reward ratio - aim for 1:2 minimum' : 'Good risk-reward management',
        mistakes.length > 2 ? 'Review and fix identified mistakes before next week' : 'Continue disciplined trading',
      ],
    });

  } catch (error: any) {
    console.error('❌ Weekly report error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate report',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get('week') || 'current';

  // Calculate week dates
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (week === 'current') {
    start.setDate(start.getDate() - start.getDay() + 1);
    end.setDate(end.getDate() - end.getDay() + 7);
  } else if (week === 'last') {
    start.setDate(start.getDate() - start.getDay() - 6);
    end.setDate(end.getDate() - end.getDay());
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return POST(
    new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    })
  );
}