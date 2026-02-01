// lib/gemini/mistake-rules.ts
// Complete Rule-based Mistake Detection System

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price?: number | null;
  stop_loss?: number | null;
  target_price?: number | null;
  quantity: number;
  position_size: number;
  pnl?: number | null;
  status: string;
  entry_time: string;
  exit_time?: string | null;
  reason?: string | null;
  emotions?: string[] | null;
  tags?: string[] | null;
}

interface Mistake {
  id: string;
  category: 'RISK_MANAGEMENT' | 'TIMING' | 'PSYCHOLOGY' | 'STRATEGY';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion: string;
  confidence: number;
}

// ==========================================
// RISK MANAGEMENT CHECKS
// ==========================================

function checkNoStopLoss(trade: Trade): Mistake | null {
  if (!trade.stop_loss || trade.stop_loss === 0) {
    return {
      id: 'NO_STOPLOSS',
      category: 'RISK_MANAGEMENT',
      severity: 'high',
      title: 'No Stop Loss Set',
      description: `Trade ${trade.symbol} was entered without a stop loss, exposing you to unlimited risk.`,
      suggestion: 'Always set a stop loss before entering a trade. Use 1-2% of your capital as maximum risk per trade.',
      confidence: 100
    };
  }
  return null;
}

function checkWideStopLoss(trade: Trade): Mistake | null {
  if (!trade.stop_loss) return null;
  
  const riskPercentage = Math.abs(
    ((trade.entry_price - trade.stop_loss) / trade.entry_price) * 100
  );
  
  if (riskPercentage > 5) {
    return {
      id: 'WIDE_STOPLOSS',
      category: 'RISK_MANAGEMENT',
      severity: 'medium',
      title: 'Stop Loss Too Wide',
      description: `Your stop loss is ${riskPercentage.toFixed(1)}% away from entry, which is too wide and increases risk.`,
      suggestion: 'Keep stop loss within 2-3% of entry price for better risk management.',
      confidence: 90
    };
  }
  return null;
}

function checkPoorRiskReward(trade: Trade): Mistake | null {
  if (!trade.stop_loss || !trade.target_price) return null;
  
  const risk = Math.abs(trade.entry_price - trade.stop_loss);
  const reward = Math.abs(trade.target_price - trade.entry_price);
  const rrRatio = reward / risk;
  
  if (rrRatio < 1.5) {
    return {
      id: 'POOR_RR_RATIO',
      category: 'RISK_MANAGEMENT',
      severity: 'high',
      title: 'Poor Risk:Reward Ratio',
      description: `Risk:Reward ratio of 1:${rrRatio.toFixed(2)} is too low. You're risking more than you can gain.`,
      suggestion: 'Aim for minimum 1:2 risk:reward ratio. Only take trades where potential profit is at least 2x the risk.',
      confidence: 95
    };
  }
  return null;
}

function checkOverLeveraged(trade: Trade): Mistake | null {
  const positionSize = trade.position_size;
  
  // Assuming account size (you can make this dynamic)
  const assumedAccountSize = 100000; // $100k
  const positionPercentage = (positionSize / assumedAccountSize) * 100;
  
  if (positionPercentage > 10) {
    return {
      id: 'OVER_LEVERAGED',
      category: 'RISK_MANAGEMENT',
      severity: 'high',
      title: 'Position Size Too Large',
      description: `Position size is ${positionPercentage.toFixed(1)}% of account, which is over-leveraged.`,
      suggestion: 'Keep position size to 2-5% of total account value to avoid catastrophic losses.',
      confidence: 85
    };
  }
  return null;
}

// ==========================================
// TIMING CHECKS
// ==========================================

function checkWeekendTrading(trade: Trade): Mistake | null {
  const entryDate = new Date(trade.entry_time);
  const dayOfWeek = entryDate.getDay();
  
  // Saturday = 6, Sunday = 0
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      id: 'WEEKEND_TRADING',
      category: 'TIMING',
      severity: 'low',
      title: 'Weekend Trading',
      description: 'Trading on weekends often has lower liquidity and wider spreads.',
      suggestion: 'Focus on trading during weekday market hours for better execution.',
      confidence: 70
    };
  }
  return null;
}

function checkLateDayTrading(trade: Trade): Mistake | null {
  const entryDate = new Date(trade.entry_time);
  const hour = entryDate.getHours();
  
  // After 3 PM IST (15:00)
  if (hour >= 15) {
    return {
      id: 'LATE_DAY_TRADING',
      category: 'TIMING',
      severity: 'low',
      title: 'Late Day Entry',
      description: 'Entering trades in the last hour of market can be risky due to volatility.',
      suggestion: 'Avoid entering new positions after 2:30 PM. Let existing positions run.',
      confidence: 65
    };
  }
  return null;
}

function checkQuickExit(trade: Trade): Mistake | null {
  if (!trade.exit_time) return null;
  
  const entryTime = new Date(trade.entry_time).getTime();
  const exitTime = new Date(trade.exit_time).getTime();
  const durationMinutes = (exitTime - entryTime) / (1000 * 60);
  
  if (durationMinutes < 5 && trade.pnl && trade.pnl < 0) {
    return {
      id: 'QUICK_EXIT',
      category: 'PSYCHOLOGY',
      severity: 'medium',
      title: 'Premature Exit',
      description: `Trade was closed in ${durationMinutes.toFixed(0)} minutes with a loss. Possible panic exit.`,
      suggestion: 'Give your trades time to work. Don\'t exit on small fluctuations unless stop loss is hit.',
      confidence: 75
    };
  }
  return null;
}

// ==========================================
// PSYCHOLOGY CHECKS
// ==========================================

function checkRevengeTrading(trade: Trade, previousTrades: Trade[]): Mistake | null {
  if (previousTrades.length === 0) return null;
  
  // Get last 3 trades
  const recentTrades = previousTrades.slice(0, 3);
  const lastTrade = recentTrades[0];
  
  if (!lastTrade || !lastTrade.pnl) return null;
  
  // Check if last trade was a loss
  if (lastTrade.pnl < 0) {
    const lastTradeTime = new Date(lastTrade.exit_time || lastTrade.entry_time).getTime();
    const currentTradeTime = new Date(trade.entry_time).getTime();
    const timeDiffMinutes = (currentTradeTime - lastTradeTime) / (1000 * 60);
    
    // If trade was taken within 30 minutes of a loss
    if (timeDiffMinutes < 30) {
      return {
        id: 'REVENGE_TRADING',
        category: 'PSYCHOLOGY',
        severity: 'high',
        title: 'Possible Revenge Trading',
        description: 'This trade was taken shortly after a loss. Be careful of emotional decisions.',
        suggestion: 'Take a 30-minute break after a losing trade. Clear your mind before the next trade.',
        confidence: 80
      };
    }
  }
  return null;
}

function checkOvertrading(trade: Trade, previousTrades: Trade[]): Mistake | null {
  // Check if more than 5 trades in one day
  const todayStart = new Date(trade.entry_time);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayTrades = previousTrades.filter((t) => {
    const tradeDate = new Date(t.entry_time);
    return tradeDate >= todayStart;
  });
  
  if (todayTrades.length > 5) {
    return {
      id: 'OVERTRADING',
      category: 'PSYCHOLOGY',
      severity: 'medium',
      title: 'Overtrading Detected',
      description: `You've taken ${todayTrades.length} trades today. Quality over quantity.`,
      suggestion: 'Limit yourself to 2-3 high-quality setups per day. Overtrading leads to mistakes.',
      confidence: 85
    };
  }
  return null;
}

function checkEmotionalTrade(trade: Trade): Mistake | null {
  if (!trade.emotions || trade.emotions.length === 0) return null;
  
  const negativeEmotions = ['fear', 'fomo', 'revenge', 'frustrated', 'angry', 'stressed'];
  const hasNegativeEmotion = trade.emotions.some((emotion) =>
    negativeEmotions.includes(emotion.toLowerCase())
  );
  
  if (hasNegativeEmotion) {
    return {
      id: 'EMOTIONAL_TRADE',
      category: 'PSYCHOLOGY',
      severity: 'high',
      title: 'Emotional Trading Detected',
      description: `Emotions detected: ${trade.emotions.join(', ')}. Trading with emotions clouds judgment.`,
      suggestion: 'Only trade when you are calm and following your plan. Take breaks when emotional.',
      confidence: 90
    };
  }
  return null;
}

// ==========================================
// STRATEGY CHECKS
// ==========================================

function checkNoTradeReason(trade: Trade): Mistake | null {
  if (!trade.reason || trade.reason.trim() === '' || trade.reason === 'Imported from Excel') {
    return {
      id: 'NO_TRADE_REASON',
      category: 'STRATEGY',
      severity: 'medium',
      title: 'No Trade Reason Documented',
      description: 'Trade was entered without documenting the reason/setup.',
      suggestion: 'Always document why you took the trade. This helps you analyze patterns later.',
      confidence: 100
    };
  }
  return null;
}

function checkCounterTrend(trade: Trade): Mistake | null {
  // This is a simplified check - in real scenario you'd analyze price action
  if (trade.tags && trade.tags.includes('counter-trend')) {
    return {
      id: 'COUNTER_TREND',
      category: 'STRATEGY',
      severity: 'medium',
      title: 'Counter-Trend Trade',
      description: 'Trading against the trend is riskier and has lower win rate.',
      suggestion: 'Focus on trend-following trades. "The trend is your friend."',
      confidence: 70
    };
  }
  return null;
}

function checkNoTarget(trade: Trade): Mistake | null {
  if (!trade.target_price || trade.target_price === 0) {
    return {
      id: 'NO_TARGET',
      category: 'STRATEGY',
      severity: 'medium',
      title: 'No Target Price Set',
      description: 'Trade entered without a clear profit target.',
      suggestion: 'Always have a profit target before entering. Know when to exit with gains.',
      confidence: 85
    };
  }
  return null;
}

// ==========================================
// MAIN DETECTION FUNCTION
// ==========================================

export function detectTradeMistakes(
  trade: Trade,
  previousTrades: Trade[] = []
): Mistake[] {
  const mistakes: Mistake[] = [];
  
  // Risk Management Checks
  const noStopLoss = checkNoStopLoss(trade);
  if (noStopLoss) mistakes.push(noStopLoss);
  
  const wideStopLoss = checkWideStopLoss(trade);
  if (wideStopLoss) mistakes.push(wideStopLoss);
  
  const poorRR = checkPoorRiskReward(trade);
  if (poorRR) mistakes.push(poorRR);
  
  const overLeveraged = checkOverLeveraged(trade);
  if (overLeveraged) mistakes.push(overLeveraged);
  
  // Timing Checks
  const weekendTrading = checkWeekendTrading(trade);
  if (weekendTrading) mistakes.push(weekendTrading);
  
  const lateDayTrading = checkLateDayTrading(trade);
  if (lateDayTrading) mistakes.push(lateDayTrading);
  
  const quickExit = checkQuickExit(trade);
  if (quickExit) mistakes.push(quickExit);
  
  // Psychology Checks
  const revengeTrade = checkRevengeTrading(trade, previousTrades);
  if (revengeTrade) mistakes.push(revengeTrade);
  
  const overtrading = checkOvertrading(trade, previousTrades);
  if (overtrading) mistakes.push(overtrading);
  
  const emotionalTrade = checkEmotionalTrade(trade);
  if (emotionalTrade) mistakes.push(emotionalTrade);
  
  // Strategy Checks
  const noReason = checkNoTradeReason(trade);
  if (noReason) mistakes.push(noReason);
  
  const counterTrend = checkCounterTrend(trade);
  if (counterTrend) mistakes.push(counterTrend);
  
  const noTarget = checkNoTarget(trade);
  if (noTarget) mistakes.push(noTarget);
  
  return mistakes;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getMistakesByCategory(mistakes: Mistake[]): {
  RISK_MANAGEMENT: Mistake[];
  TIMING: Mistake[];
  PSYCHOLOGY: Mistake[];
  STRATEGY: Mistake[];
} {
  return {
    RISK_MANAGEMENT: mistakes.filter((m) => m.category === 'RISK_MANAGEMENT'),
    TIMING: mistakes.filter((m) => m.category === 'TIMING'),
    PSYCHOLOGY: mistakes.filter((m) => m.category === 'PSYCHOLOGY'),
    STRATEGY: mistakes.filter((m) => m.category === 'STRATEGY'),
  };
}

export function getMistakesBySeverity(mistakes: Mistake[]): {
  high: Mistake[];
  medium: Mistake[];
  low: Mistake[];
} {
  return {
    high: mistakes.filter((m) => m.severity === 'high'),
    medium: mistakes.filter((m) => m.severity === 'medium'),
    low: mistakes.filter((m) => m.severity === 'low'),
  };
}

export function calculateMistakeScore(mistakes: Mistake[]): number {
  // Severity weights: high = 10, medium = 5, low = 2
  return mistakes.reduce((score, mistake) => {
    if (mistake.severity === 'high') return score + 10;
    if (mistake.severity === 'medium') return score + 5;
    return score + 2;
  }, 0);
}