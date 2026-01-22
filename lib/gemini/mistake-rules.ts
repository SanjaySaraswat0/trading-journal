// File: src/lib/gemini/mistake-rules.ts
// FINAL VERSION - Complete mistake detection system

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number | null;  // ✅ Fixed: Allow null
  stop_loss?: number | null;   // ✅ Fixed: Allow null
  target_price?: number | null; // ✅ Fixed: Allow null
  quantity: number;
  position_size: number;
  pnl?: number | null;         // ✅ Fixed: Allow null
  status: string;
  entry_time: string;
  exit_time?: string | null;   // ✅ Fixed: Allow null
  reason?: string | null;      // ✅ Fixed: Allow null
  emotions?: string[] | null;  // ✅ Fixed: Allow null
  tags?: string[] | null;      // ✅ Fixed: Allow null
}

export interface MistakeDetection {
  id: string;
  category: 'RISK_MANAGEMENT' | 'TIMING' | 'PSYCHOLOGY' | 'STRATEGY';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  detected: boolean;
}

// Risk Management Rules
function checkNoStopLoss(trade: Trade): MistakeDetection {
  return {
    id: 'NO_STOPLOSS',
    category: 'RISK_MANAGEMENT',
    severity: 'high',
    message: 'Trade entered without stop loss - high risk',
    suggestion: 'Always set a stop loss before entering any trade to limit potential losses',
    detected: !trade.stop_loss && trade.exit_price === undefined
  };
}

function checkWideStopLoss(trade: Trade): MistakeDetection {
  if (!trade.stop_loss) return { ...checkNoStopLoss(trade), detected: false };
  
  const stopDistance = Math.abs(trade.entry_price - trade.stop_loss);
  const riskPercent = (stopDistance / trade.entry_price) * 100;
  
  return {
    id: 'WIDE_STOPLOSS',
    category: 'RISK_MANAGEMENT',
    severity: riskPercent > 5 ? 'high' : 'medium',
    message: `Stop loss is ${riskPercent.toFixed(1)}% away - too wide`,
    suggestion: 'Keep stop loss within 2-3% for better risk management',
    detected: riskPercent > 5
  };
}

function checkOverLeveraged(trade: Trade): MistakeDetection {
  const isOverLeveraged = trade.position_size > 10000;
  
  return {
    id: 'OVER_LEVERAGED',
    category: 'RISK_MANAGEMENT',
    severity: 'high',
    message: `Position size $${trade.position_size.toFixed(2)} may be too large`,
    suggestion: 'Risk no more than 2% of your account on a single trade',
    detected: isOverLeveraged
  };
}

function checkNoTarget(trade: Trade): MistakeDetection {
  return {
    id: 'NO_TARGET',
    category: 'RISK_MANAGEMENT',
    severity: 'medium',
    message: 'No profit target set',
    suggestion: 'Always define your profit target before entering a trade',
    detected: !trade.target_price && trade.exit_price === undefined
  };
}

// Timing Rules
function checkWeekendHolding(trade: Trade): MistakeDetection {
  const entryDate = new Date(trade.entry_time);
  const dayOfWeek = entryDate.getDay();
  const isFriday = dayOfWeek === 5;
  const isLateEntry = entryDate.getHours() >= 14;
  
  return {
    id: 'WEEKEND_HOLDING',
    category: 'TIMING',
    severity: 'medium',
    message: 'Trade entered late on Friday - weekend gap risk',
    suggestion: 'Avoid holding positions over the weekend to prevent gap risk',
    detected: isFriday && isLateEntry && !trade.exit_price
  };
}

function checkQuickExit(trade: Trade): MistakeDetection {
  if (!trade.exit_time) return { id: 'QUICK_EXIT', category: 'TIMING', severity: 'low', message: '', suggestion: '', detected: false };
  
  const entryTime = new Date(trade.entry_time).getTime();
  const exitTime = new Date(trade.exit_time).getTime();
  const durationMinutes = (exitTime - entryTime) / (1000 * 60);
  
  return {
    id: 'QUICK_EXIT',
    category: 'TIMING',
    severity: 'low',
    message: `Trade closed in ${durationMinutes.toFixed(0)} minutes - possibly impulsive`,
    suggestion: 'Give your trades time to work according to your plan',
    detected: durationMinutes < 5 && trade.pnl != null && trade.pnl < 0
  };
}

// Psychology Rules
function checkRevengeTrade(trade: Trade, previousTrades: Trade[]): MistakeDetection {
  if (previousTrades.length === 0) {
    return { id: 'REVENGE_TRADE', category: 'PSYCHOLOGY', severity: 'high', message: '', suggestion: '', detected: false };
  }
  
  const lastTrade = previousTrades[0];
  const isLastTradeLoss = lastTrade.pnl !== undefined && lastTrade.pnl !== null && lastTrade.pnl < 0;
  
  if (!isLastTradeLoss) {
    return { id: 'REVENGE_TRADE', category: 'PSYCHOLOGY', severity: 'high', message: '', suggestion: '', detected: false };
  }
  
  const lastExitTime = lastTrade.exit_time ? new Date(lastTrade.exit_time).getTime() : 0;
  const currentEntryTime = new Date(trade.entry_time).getTime();
  const minutesBetween = (currentEntryTime - lastExitTime) / (1000 * 60);
  
  const isRevengeTrade = minutesBetween < 30 && trade.position_size >= lastTrade.position_size;
  
  return {
    id: 'REVENGE_TRADE',
    category: 'PSYCHOLOGY',
    severity: 'high',
    message: 'Possible revenge trade after loss',
    suggestion: 'Take a break after a losing trade. Never trade emotionally',
    detected: isRevengeTrade || (trade.tags?.includes('revenge') || false)
  };
}

function checkFOMO(trade: Trade): MistakeDetection {
  const hasFOMOTag = trade.tags?.includes('fomo') || false;
  const hasFOMOEmotion = trade.emotions?.includes('fomo') || trade.emotions?.includes('rushed') || false;
  const noReason = !trade.reason || trade.reason.trim().length < 10;
  
  return {
    id: 'FOMO_ENTRY',
    category: 'PSYCHOLOGY',
    severity: 'high',
    message: 'FOMO (Fear of Missing Out) detected',
    suggestion: 'Only enter trades that match your strategy. Missing a trade is better than a bad trade',
    detected: hasFOMOTag || hasFOMOEmotion || noReason
  };
}

function checkEmotionalTrading(trade: Trade): MistakeDetection {
  const negativeEmotions = ['fear', 'panic', 'desperate', 'frustrated', 'angry', 'rushed'];
  const hasNegativeEmotions = trade.emotions?.some(e => 
    negativeEmotions.includes(e.toLowerCase())
  ) || false;
  
  return {
    id: 'EMOTIONAL_TRADING',
    category: 'PSYCHOLOGY',
    severity: 'medium',
    message: 'Negative emotions detected during trade',
    suggestion: 'Trade only when calm and following your plan. Take a break if emotional',
    detected: hasNegativeEmotions
  };
}

function checkOvertrading(trades: Trade[]): MistakeDetection {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.entry_time);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });
  
  return {
    id: 'OVERTRADING',
    category: 'PSYCHOLOGY',
    severity: todayTrades.length > 5 ? 'high' : 'medium',
    message: `${todayTrades.length} trades today - possible overtrading`,
    suggestion: 'Quality over quantity. Limit daily trades to 3-5 maximum',
    detected: todayTrades.length > 5
  };
}

// Strategy Rules
function checkCounterTrend(trade: Trade): MistakeDetection {
  const hasCounterTrendTag = trade.tags?.includes('counter-trend') || false;
  
  return {
    id: 'COUNTER_TREND',
    category: 'STRATEGY',
    severity: 'medium',
    message: 'Trading against the trend',
    suggestion: 'The trend is your friend. Prefer trading with the trend',
    detected: hasCounterTrendTag
  };
}

function checkPoorRiskReward(trade: Trade): MistakeDetection {
  if (!trade.stop_loss || !trade.target_price) {
    return { id: 'POOR_RISK_REWARD', category: 'STRATEGY', severity: 'low', message: '', suggestion: '', detected: false };
  }
  
  const risk = Math.abs(trade.entry_price - trade.stop_loss);
  const reward = Math.abs(trade.target_price - trade.entry_price);
  const rrRatio = reward / risk;
  
  return {
    id: 'POOR_RISK_REWARD',
    category: 'STRATEGY',
    severity: rrRatio < 1.5 ? 'high' : 'medium',
    message: `Risk-Reward ratio is ${rrRatio.toFixed(2)} - too low`,
    suggestion: 'Aim for minimum 2:1 risk-reward ratio on all trades',
    detected: rrRatio < 2
  };
}

function checkNoTradePlan(trade: Trade): MistakeDetection {
  const hasReason = trade.reason && trade.reason.trim().length > 20;
  const hasStopLoss = !!trade.stop_loss;
  const hasTarget = !!trade.target_price;
  
  const lacksPlanning = !hasReason || !hasStopLoss || !hasTarget;
  
  return {
    id: 'NO_TRADE_PLAN',
    category: 'STRATEGY',
    severity: 'high',
    message: 'Trade lacks proper planning',
    suggestion: 'Always document entry reason, stop loss, and target before trading',
    detected: lacksPlanning
  };
}

// Main detection function
export function detectTradeMistakes(
  trade: Trade,
  allTrades: Trade[] = []
): MistakeDetection[] {
  const previousTrades = allTrades
    .filter(t => t.id !== trade.id)
    .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
  
  const allChecks = [
    // Risk Management
    checkNoStopLoss(trade),
    checkWideStopLoss(trade),
    checkOverLeveraged(trade),
    checkNoTarget(trade),
    
    // Timing
    checkWeekendHolding(trade),
    checkQuickExit(trade),
    
    // Psychology
    checkRevengeTrade(trade, previousTrades),
    checkFOMO(trade),
    checkEmotionalTrading(trade),
    checkOvertrading([trade, ...previousTrades]),
    
    // Strategy
    checkCounterTrend(trade),
    checkPoorRiskReward(trade),
    checkNoTradePlan(trade)
  ];
  
  return allChecks.filter(check => check.detected);
}

// Get mistake statistics
export function getMistakeStats(trades: Trade[]): {
  totalMistakes: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  mostCommon: string;
} {
  const allMistakes: MistakeDetection[] = [];
  
  trades.forEach(trade => {
    const mistakes = detectTradeMistakes(trade, trades);
    allMistakes.push(...mistakes);
  });
  
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const mistakeCount: Record<string, number> = {};
  
  allMistakes.forEach(mistake => {
    byCategory[mistake.category] = (byCategory[mistake.category] || 0) + 1;
    bySeverity[mistake.severity] = (bySeverity[mistake.severity] || 0) + 1;
    mistakeCount[mistake.id] = (mistakeCount[mistake.id] || 0) + 1;
  });
  
  const mostCommon = Object.entries(mistakeCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';
  
  return {
    totalMistakes: allMistakes.length,
    byCategory,
    bySeverity,
    mostCommon
  };
}