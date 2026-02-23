// lib/ai/predictive.ts
// Predictive Insights Engine - Forward-Looking Trading Recommendations
// 100% Free - Uses pattern analysis to predict future performance

import { CompletePatternAnalysis } from './pattern-detectors';
import { TraderProfile } from './coaching';

interface Trade {
    id: string;
    symbol: string;
    trade_type: 'long' | 'short';
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    pnl: number | null;
    status: string;
    entry_time: string;
    exit_time: string | null;
    setup_type: string | null;
    stop_loss: number | null;
    target_price: number | null;
}

// ==========================================
// OPTIMAL TRADING SCHEDULE PREDICTOR
// ==========================================
export interface OptimalSchedule {
    bestTradingHours: number[]; // Array of hours (9, 10, 11, etc.)
    worstTradingHours: number[];
    bestDays: string[];
    worstDays: string[];
    recommendation: string;
    confidenceScore: number; // 0-100
}

export function predictOptimalSchedule(
    patterns: CompletePatternAnalysis
): OptimalSchedule {
    // Extract best hours (top 3 with positive P&L)
    const hourlyData = patterns.timeOfDay.hourlyPerformance
        .filter((h) => h.avgPnL > 0)
        .sort((a, b) => b.avgPnL - a.avgPnL)
        .slice(0, 3);

    const bestHours = hourlyData.map((h) => h.hour);

    // Extract worst hours (bottom 2 with negative P&L)
    const worstHourData = patterns.timeOfDay.hourlyPerformance
        .filter((h) => h.avgPnL < 0)
        .sort((a, b) => a.avgPnL - b.avgPnL)
        .slice(0, 2);

    const worstHours = worstHourData.map((h) => h.hour);

    // Best and worst days
    const bestDays = patterns.marketConditions.dayOfWeekPerformance
        .filter((d) => d.avgPnL > 0)
        .sort((a, b) => b.avgPnL - a.avgPnL)
        .slice(0, 2)
        .map((d) => d.day);

    const worstDays = patterns.marketConditions.dayOfWeekPerformance
        .filter((d) => d.avgPnL < 0)
        .map((d) => d.day);

    // Confidence based on sample size
    const totalTrades = patterns.timeOfDay.hourlyPerformance.reduce(
        (sum, h) => sum + h.tradeCount,
        0
    );
    const confidenceScore = Math.min(totalTrades * 2, 100);

    const recommendation = `Trade during ${bestHours.join(', ')}:00 hours on ${bestDays.join(' and ')}. ${worstHours.length > 0 ? `Avoid ${worstHours.join(', ')}:00.` : ''}`;

    return {
        bestTradingHours: bestHours,
        worstTradingHours: worstHours,
        bestDays,
        worstDays,
        recommendation,
        confidenceScore,
    };
}

// ==========================================
// SETUP SUCCESS PREDICTOR & RANKING
// ==========================================
export interface SetupPredictions {
    focusSetups: {
        name: string;
        expectedWinRate: number;
        expectedAvgPnL: number;
        tradeFrequency: 'high' | 'medium' | 'low';
    }[];
    avoidSetups: {
        name: string;
        lossRate: number;
        avgLoss: number;
        reason: string;
    }[];
    recommendation: string;
}

export function predictSetupSuccess(
    patterns: CompletePatternAnalysis
): SetupPredictions {
    const setups = patterns.setupAnalysis.setups;

    // Focus setups: Good or Excellent verdicts
    const focusSetups = setups
        .filter((s) => s.verdict === 'excellent' || s.verdict === 'good')
        .slice(0, 3)
        .map((s) => ({
            name: s.name,
            expectedWinRate: s.winRate,
            expectedAvgPnL: s.avgPnL,
            tradeFrequency:
                s.tradeCount > 20 ? ('high' as const) : s.tradeCount > 10 ? ('medium' as const) : ('low' as const),
        }));

    // Avoid setups: Poor or Avoid verdicts
    const avoidSetups = setups
        .filter((s) => s.verdict === 'poor' || s.verdict === 'avoid')
        .map((s) => ({
            name: s.name,
            lossRate: 100 - s.winRate,
            avgLoss: s.avgPnL,
            reason:
                s.avgPnL < -200
                    ? 'Large average losses'
                    : s.winRate < 40
                        ? 'Low win rate'
                        : 'Negative P&L',
        }));

    let recommendation = '';
    if (focusSetups.length > 0) {
        recommendation = `Focus on "${focusSetups[0].name}" (${focusSetups[0].expectedWinRate}% win rate). `;
    }
    if (avoidSetups.length > 0) {
        recommendation += `Stop trading "${avoidSetups[0].name}" setup immediately.`;
    }
    if (!recommendation) {
        recommendation = 'Collect more data to identify best setups.';
    }

    return {
        focusSetups,
        avoidSetups,
        recommendation,
    };
}

// ==========================================
// POSITION SIZING OPTIMIZER
// ==========================================
export interface PositionSizingAdvice {
    currentAvgSize: number;
    recommendedSize: number;
    reasoning: string;
    riskOfRuin: number; // 0-100% probability
    maxDrawdownEstimate: number;
}

export function optimizePositionSizing(
    trades: Trade[],
    profile: TraderProfile
): PositionSizingAdvice {
    // Calculate current average position size
    const closedTrades = trades.filter((t) => t.pnl !== null);
    const avgSize =
        closedTrades.reduce((sum, t) => sum + t.entry_price * t.quantity, 0) /
        closedTrades.length;

    const winRate = closedTrades.filter((t) => t.pnl! > 0).length / closedTrades.length;
    const avgWin =
        closedTrades.filter((t) => t.pnl! > 0).reduce((sum, t) => sum + t.pnl!, 0) /
        closedTrades.filter((t) => t.pnl! > 0).length;
    const avgLoss =
        Math.abs(
            closedTrades.filter((t) => t.pnl! < 0).reduce((sum, t) => sum + t.pnl!, 0)
        ) / closedTrades.filter((t) => t.pnl! < 0).length;

    // Kelly Criterion (simplified)
    const kellyPercent = ((winRate * avgWin - (1 - winRate) * avgLoss) / avgWin) * 100;

    // Risk of Ruin (simplified - assumes constant risk)
    // RoR = ((1-WinRate)/(1+WinRate))^AccountUnits
    // Simplified approximation: Higher win rate = lower RoR
    const riskOfRuin = winRate > 0.5 ? Math.max((1 - winRate) * 100, 5) : 50;

    let recommendedSize = avgSize;
    let reasoning = '';

    if (winRate < 0.45) {
        recommendedSize = avgSize * 0.5; // Cut size by half
        reasoning = `Win rate ${(winRate * 100).toFixed(1)}% is too low. Reduce size by 50% until you improve.`;
    } else if (profile.riskTolerance === 'aggressive' && profile.disciplineScore < 60) {
        recommendedSize = avgSize * 0.7;
        reasoning = 'Low discipline + aggressive style = high risk. Reduce size by 30%.';
    } else if (winRate > 0.6 && profile.disciplineScore > 75) {
        recommendedSize = avgSize * 1.2; // Can increase size slightly
        reasoning = `Strong win rate (${(winRate * 100).toFixed(1)}%) and discipline. You can increase size by 20%.`;
    } else {
        reasoning = 'Current position sizing is appropriate for your stats.';
    }

    return {
        currentAvgSize: Math.round(avgSize),
        recommendedSize: Math.round(recommendedSize),
        reasoning,
        riskOfRuin: Math.round(riskOfRuin),
        maxDrawdownEstimate: Math.round(avgLoss * 3), // Rough estimate
    };
}

// ==========================================
// RISK AREA ALERTS (PROACTIVE WARNINGS)
// ==========================================
export interface RiskAlert {
    type: 'timing' | 'emotional' | 'pattern' | 'discipline';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    whenToWatch: string;
}

export function generateRiskAlerts(
    patterns: CompletePatternAnalysis,
    profile: TraderProfile
): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    // Timing-based alerts
    if (patterns.timeOfDay.worstHour.avgPnL < -100) {
        alerts.push({
            type: 'timing',
            severity: 'warning',
            message: `You lose ${Math.abs(patterns.timeOfDay.worstHour.avgPnL)} on average at ${patterns.timeOfDay.worstHour.hour}:00`,
            whenToWatch: `Every day at ${patterns.timeOfDay.worstHour.hour}:00 - consider skipping this hour`,
        });
    }

    if (patterns.marketConditions.worstDay !== 'Monday') {
        const worstDayData = patterns.marketConditions.dayOfWeekPerformance.find(
            (d) => d.day === patterns.marketConditions.worstDay
        );
        if (worstDayData && worstDayData.avgPnL < -200) {
            alerts.push({
                type: 'timing',
                severity: 'warning',
                message: `${patterns.marketConditions.worstDay}s are your worst day (${worstDayData.avgPnL} avg)`,
                whenToWatch: `Every ${patterns.marketConditions.worstDay} - trade less or take a break`,
            });
        }
    }

    // Emotional alerts
    if (patterns.revengeTrading.detected) {
        alerts.push({
            type: 'emotional',
            severity: 'critical',
            message: `You revenge trade after losses (${patterns.revengeTrading.totalInstances
        } times)`,
      whenToWatch: 'Immediately after ANY losing trade - wait 30 minutes before next trade',
    });
  }

  if (patterns.fomo.detected) {
    alerts.push({
      type: 'emotional',
      severity: 'warning',
      message: `${ patterns.fomo.totalInstances } FOMO entries detected`,
      whenToWatch: 'When you feel rushed or see big price movements - pause before entering',
    });
  }

  // Pattern alerts
  if (patterns.overtrading.detected) {
    alerts.push({
      type: 'pattern',
      severity: 'warning',
      message: `You overtrade on ${ patterns.overtrading.overtradingDays.length } days`,
      whenToWatch: 'After 5 trades in a day - stop trading and review',
    });
  }

  // Discipline alerts
  if (profile.disciplineScore < 60) {
    alerts.push({
      type: 'discipline',
      severity: 'critical',
      message: `Low discipline score(${ profile.disciplineScore } / 100) - you don't follow your plan`,
        whenToWatch: 'Before EVERY trade - ask: Does this match my plan exactly?',
    });
}

return alerts.sort((a, b) => {
    const severityOrder = { critical: 1, warning: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
});
}

// ==========================================
// COMPLETE PREDICTIVE ANALYSIS
// ==========================================
export interface CompletePredictiveAnalysis {
    optimalSchedule: OptimalSchedule;
    setupPredictions: SetupPredictions;
    positionSizing: PositionSizingAdvice;
    riskAlerts: RiskAlert[];
    overallRecommendation: string;
}

export function runCompletePredictiveAnalysis(
    trades: Trade[],
    patterns: CompletePatternAnalysis,
    profile: TraderProfile
): CompletePredictiveAnalysis {
    const optimalSchedule = predictOptimalSchedule(patterns);
    const setupPredictions = predictSetupSuccess(patterns);
    const positionSizing = optimizePositionSizing(trades, profile);
    const riskAlerts = generateRiskAlerts(patterns, profile);

    // Overall recommendation (top priority action)
    let overallRecommendation = '';
    if (riskAlerts[0]?.severity === 'critical') {
        overallRecommendation = `🚨 TOP PRIORITY: ${riskAlerts[0].message}`;
    } else if (setupPredictions.focusSetups.length > 0) {
        overallRecommendation = `Focus on "${setupPredictions.focusSetups[0].name}" setup during ${optimalSchedule.bestTradingHours[0]}:00 hour`;
    } else {
        overallRecommendation = 'Continue current strategy while collecting more data';
    }

    return {
        optimalSchedule,
        setupPredictions,
        positionSizing,
        riskAlerts,
        overallRecommendation,
    };
}
