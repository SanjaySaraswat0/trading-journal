// lib/gemini/prompts.ts
// Complete AI Prompts for Trading Analysis

interface Trade {
  symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price?: number | null;
  stop_loss?: number | null;
  target_price?: number | null;
  quantity: number;
  pnl?: number | null;
  status: string;
  entry_time: string;
  exit_time?: string | null;
  reason?: string | null;
  emotions?: string[] | null;
  tags?: string[] | null;
}

// ==========================================
// SINGLE TRADE ANALYSIS PROMPT
// ==========================================
export function createTradeAnalysisPrompt(trade: Trade): string {
  return `You are an expert trading analyst. Analyze this trade and provide insights in JSON format.

Trade Details:
- Symbol: ${trade.symbol}
- Type: ${trade.trade_type.toUpperCase()}
- Entry Price: $${trade.entry_price}
- Exit Price: ${trade.exit_price ? `$${trade.exit_price}` : 'Still Open'}
- Stop Loss: ${trade.stop_loss ? `$${trade.stop_loss}` : 'Not Set'}
- Target: ${trade.target_price ? `$${trade.target_price}` : 'Not Set'}
- Quantity: ${trade.quantity}
- P&L: ${trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'N/A'}
- Status: ${trade.status}
- Entry Time: ${trade.entry_time}
- Reason: ${trade.reason || 'Not provided'}
- Emotions: ${trade.emotions?.join(', ') || 'None recorded'}
- Tags: ${trade.tags?.join(', ') || 'None'}

Provide analysis in this EXACT JSON format (no additional text):
{
  "mistakes": [
    {
      "type": "RISK_MANAGEMENT | TIMING | PSYCHOLOGY | STRATEGY",
      "description": "What went wrong",
      "severity": "low | medium | high",
      "suggestion": "How to fix it"
    }
  ],
  "strengths": [
    {
      "aspect": "What was done well",
      "description": "Why it was good",
      "recommendation": "How to maintain this"
    }
  ],
  "emotional_analysis": {
    "detected_emotions": ["fear", "confidence", "etc"],
    "emotional_score": 7,
    "impact_on_trade": "How emotions affected the trade",
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  },
  "risk_analysis": {
    "risk_reward_ratio": 2.5,
    "position_sizing": "appropriate | too_large | too_small",
    "stop_loss_quality": "good | poor | missing",
    "recommendations": ["Recommendation 1"]
  },
  "overall_rating": 7,
  "summary": "Brief summary of the trade performance"
}`;
}

// ==========================================
// PATTERN ANALYSIS PROMPT (MULTIPLE TRADES)
// ==========================================
export function createPatternAnalysisPrompt(trades: Trade[]): string {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl && t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl && t.pnl < 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades * 100).toFixed(1) : '0';
  
  const tradesData = trades.slice(0, 20).map(t => ({
    symbol: t.symbol,
    type: t.trade_type,
    pnl: t.pnl,
    status: t.status,
    emotions: t.emotions,
    tags: t.tags,
    reason: t.reason
  }));

  return `You are an expert trading analyst. Analyze these trading patterns and provide insights in JSON format.

Trading Statistics:
- Total Trades: ${totalTrades}
- Winning Trades: ${winningTrades.length}
- Losing Trades: ${losingTrades.length}
- Win Rate: ${winRate}%

Recent Trades (last 20):
${JSON.stringify(tradesData, null, 2)}

Identify patterns and provide analysis in this EXACT JSON format (no additional text):
{
  "patterns_identified": [
    {
      "pattern_type": "winning_setup | losing_pattern | emotional_pattern | timing_pattern",
      "description": "What pattern was found",
      "frequency": 5,
      "impact": "positive | negative | neutral",
      "recommendation": "What to do about it"
    }
  ],
  "biggest_weakness": {
    "area": "risk_management | psychology | timing | strategy",
    "description": "Main weakness description",
    "frequency": "how_often",
    "improvement_plan": ["Step 1", "Step 2", "Step 3"]
  },
  "biggest_strength": {
    "area": "What you do best",
    "description": "Why this is a strength",
    "how_to_leverage": "How to use this strength more"
  },
  "common_mistakes": [
    {
      "mistake": "Common mistake description",
      "occurrence_count": 5,
      "severity": "low | medium | high",
      "fix": "How to avoid this"
    }
  ],
  "performance_insights": {
    "best_trading_time": "When you perform best",
    "best_setup_type": "Your most profitable setup",
    "worst_setup_type": "Your least profitable setup",
    "emotional_patterns": "Emotional patterns observed"
  },
  "next_week_focus": [
    "Focus area 1",
    "Focus area 2",
    "Focus area 3"
  ],
  "overall_assessment": "Overall trading performance assessment"
}`;
}

// ==========================================
// WEEKLY REPORT PROMPT
// ==========================================
export function createWeeklyReportPrompt(
  trades: Trade[],
  weekStats: {
    totalPnL: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
  }
): string {
  return `You are a professional trading coach. Create a comprehensive weekly trading report.

Week Statistics:
- Total Trades: ${weekStats.totalTrades}
- Total P&L: $${weekStats.totalPnL.toFixed(2)}
- Win Rate: ${weekStats.winRate.toFixed(1)}%
- Average Win: $${weekStats.avgWin.toFixed(2)}
- Average Loss: $${weekStats.avgLoss.toFixed(2)}

Recent Trades:
${JSON.stringify(trades.slice(0, 10), null, 2)}

Generate a weekly report in this EXACT JSON format (no additional text):
{
  "week_summary": {
    "performance_grade": "A+ | A | B | C | D | F",
    "key_achievement": "Main achievement this week",
    "main_concern": "Main area of concern",
    "progress_from_last_week": "How you improved"
  },
  "top_3_wins": [
    {
      "trade": "Trade symbol",
      "reason": "Why this was a good trade"
    }
  ],
  "top_3_lessons": [
    {
      "lesson": "Key lesson learned",
      "action_item": "What to do differently"
    }
  ],
  "emotional_health": {
    "score": 7,
    "assessment": "Your emotional state assessment",
    "red_flags": ["Red flag 1", "Red flag 2"],
    "positive_signs": ["Positive sign 1"]
  },
  "next_week_goals": [
    {
      "goal": "Specific goal",
      "action_steps": ["Step 1", "Step 2"],
      "success_metric": "How to measure success"
    }
  ],
  "coach_message": "Motivational message from your trading coach"
}`;
}

// ==========================================
// MISTAKE DETECTION PROMPT
// ==========================================
export function createMistakeDetectionPrompt(trade: Trade): string {
  return `Analyze this trade for common trading mistakes. Be strict and honest.

Trade:
- Symbol: ${trade.symbol}
- Type: ${trade.trade_type}
- Entry: $${trade.entry_price}
- Exit: ${trade.exit_price ? `$${trade.exit_price}` : 'Open'}
- Stop Loss: ${trade.stop_loss ? `$${trade.stop_loss}` : 'NONE'}
- Target: ${trade.target_price ? `$${trade.target_price}` : 'NONE'}
- Result: ${trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'Pending'}
- Reason: ${trade.reason || 'NONE PROVIDED'}
- Emotions: ${trade.emotions?.join(', ') || 'None'}
- Tags: ${trade.tags?.join(', ') || 'None'}

Check for these mistakes and return JSON:
{
  "mistakes_found": [
    {
      "category": "RISK_MANAGEMENT | TIMING | PSYCHOLOGY | STRATEGY",
      "mistake_id": "NO_STOPLOSS | OVER_LEVERAGED | REVENGE_TRADING | etc",
      "severity": "low | medium | high",
      "description": "What the mistake was",
      "consequence": "What could/did happen",
      "prevention": "How to avoid next time"
    }
  ],
  "risk_score": 3,
  "confidence_score": 85,
  "is_high_risk": false
}`;
}