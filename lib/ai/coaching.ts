// lib/ai/coaching.ts
// AI Trading Coach - Personalized, Data-Driven Coaching System
// Uses FREE Gemini Flash API for intelligent recommendations

import { runCompletePatternAnalysis, CompletePatternAnalysis } from './pattern-detectors';

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
    reason: string | null;
    emotions: string[] | null;
    tags: string[] | null;
    stop_loss: number | null;
    target_price: number | null;
}

// ==========================================
// TRADER PROFILE BUILDER
// ==========================================
export interface TraderProfile {
    tradingStyle: 'scalper' | 'day_trader' | 'swing_trader' | 'mixed';
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    avgTradesPerDay: number;
    avgHoldTimeMinutes: number;
    primaryWeakness: string;
    primaryStrength: string;
    emotionalPattern: string;
    disciplineScore: number; // 0-100
}

export function buildTraderProfile(
    trades: Trade[],
    patterns: CompletePatternAnalysis
): TraderProfile {
    // Determine trading style based on holding time
    const avgHold = patterns.holdingTime.avgHoldingTimeMinutes;
    let tradingStyle: TraderProfile['tradingStyle'];
    if (avgHold < 60) tradingStyle = 'scalper';
    else if (avgHold < 480) tradingStyle = 'day_trader'; // < 8 hours
    else if (avgHold < 1440 * 3) tradingStyle = 'swing_trader'; // < 3 days
    else tradingStyle = 'mixed';

    // Determine risk tolerance
    const overtradingDays = patterns.overtrading.overtradingDays.length;
    const revengeInstances = patterns.revengeTrading.totalInstances;
    let riskTolerance: TraderProfile['riskTolerance'];
    if (overtradingDays > 3 || revengeInstances > 5) riskTolerance = 'aggressive';
    else if (overtradingDays > 1 || revengeInstances > 2) riskTolerance = 'moderate';
    else riskTolerance = 'conservative';

    // Identify primary weakness
    let primaryWeakness = 'No major weakness detected';
    if (patterns.revengeTrading.detected) {
        primaryWeakness = `Revenge trading (${revengeInstances} instances)`;
    } else if (patterns.overtrading.detected) {
        primaryWeakness = `Overtrading (${overtradingDays} days with >5 trades)`;
    } else if (patterns.holdingTime.quickExitPattern) {
        primaryWeakness = 'Cutting winners short, letting losers run';
    } else if (patterns.riskReward.disciplineScore < 60) {
        primaryWeakness = `Low discipline (${patterns.riskReward.disciplineScore}/100)`;
    }

    // Identify primary strength
    let primaryStrength = 'Consistent execution';
    if (patterns.setupAnalysis.setups.length > 0) {
        const bestSetup = patterns.setupAnalysis.setups[0];
        if (bestSetup.winRate > 60) {
            primaryStrength = `Excellent "${bestSetup.name}" setup (${bestSetup.winRate}% win rate)`;
        }
    }
    if (patterns.riskReward.disciplineScore > 80) {
        primaryStrength = `Strong discipline (${patterns.riskReward.disciplineScore}/100)`;
    }

    // Emotional pattern
    let emotionalPattern = 'Neutral emotional control';
    if (patterns.fomo.detected) {
        emotionalPattern = `FOMO tendencies (${patterns.fomo.totalInstances} impulsive entries)`;
    } else if (patterns.streaks.longestLossStreak >= 5) {
        emotionalPattern = `Handles losing streaks poorly (max ${patterns.streaks.longestLossStreak} losses)`;
    } else if (patterns.streaks.longestWinStreak >= 5) {
        emotionalPattern = `Good emotional stability (${patterns.streaks.longestWinStreak} win streak)`;
    }

    return {
        tradingStyle,
        riskTolerance,
        avgTradesPerDay: patterns.overtrading.averageTradesPerDay,
        avgHoldTimeMinutes: avgHold,
        primaryWeakness,
        primaryStrength,
        emotionalPattern,
        disciplineScore: patterns.riskReward.disciplineScore,
    };
}

// ==========================================
// PERSONALIZED COACHING GOALS
// ==========================================
export interface CoachingGoal {
    goal: string; // Specific, measurable goal
    why: string; // Data-driven reason
    how: string; // Action steps
    metric: string; // How to measure success
    priority: 'critical' | 'high' | 'medium';
}

export function generatePersonalizedGoals(
    profile: TraderProfile,
    patterns: CompletePatternAnalysis
): CoachingGoal[] {
    const goals: CoachingGoal[] = [];

    // Goal 1: Address primary weakness (CRITICAL)
    if (patterns.revengeTrading.detected && patterns.revengeTrading.totalInstances > 0) {
        goals.push({
            goal: 'Eliminate revenge trading',
            why: `You took ${patterns.revengeTrading.totalInstances} revenge trades. This destroys your edge.`,
            how: 'Set hard rule: Wait 30 minutes after ANY loss before next trade. Use a timer.',
            metric: 'Zero trades within 30min of a loss for 2 weeks',
            priority: 'critical',
        });
    }

    if (patterns.overtrading.detected) {
        const avgTrades = patterns.overtrading.averageTradesPerDay;
        const targetTrades = Math.min(5, Math.ceil(avgTrades * 0.7));
        goals.push({
            goal: `Reduce trade count from ${Math.round(avgTrades)} to max ${targetTrades} per day`,
            why: `Your win rate drops when you overtrade. Quality over quantity.`,
            how: `Score each setup 1-10. Only take trades rated 8+. Track in a spreadsheet.`,
            metric: `Max ${targetTrades} trades per day for 2 weeks`,
            priority: 'critical',
        });
    }

    // Goal 2: Improve discipline
    if (patterns.riskReward.disciplineScore < 70) {
        goals.push({
            goal: `Improve trade discipline from ${patterns.riskReward.disciplineScore}/100 to 80+`,
            why: 'You deviate from your trading plan. This reduces profitability.',
            how: 'Exit at stop loss or target ONLY. No moving targets mid-trade.',
            metric: '80% of trades hit SL or target exactly',
            priority: 'high',
        });
    }

    // Goal 3: Fix holding time pattern (if applicable)
    if (patterns.holdingTime.quickExitPattern) {
        goals.push({
            goal: 'Let winners run longer than losers',
            why: `You hold losers ${Math.round(patterns.holdingTime.losingTradesAvgHold)}min but winners only ${Math.round(patterns.holdingTime.winningTradesAvgHold)}min`,
            how: 'Use trailing stop loss. Exit losers at SL immediately.',
            metric: 'Avg winning hold time > avg losing hold time',
            priority: 'high',
        });
    }

    // Goal 4: Focus on best setup (always include)
    if (patterns.setupAnalysis.setups.length > 0) {
        const best = patterns.setupAnalysis.setups[0];
        const worst =
            patterns.setupAnalysis.setups[patterns.setupAnalysis.setups.length - 1];

        if (best.verdict === 'excellent' || best.verdict === 'good') {
            goals.push({
                goal: `Trade "${best.name}" setup 70% of the time`,
                why: `Your best setup: ${best.winRate}% win rate, avg ${best.avgPnL} P&L`,
                how: `Actively hunt for "${best.name}" setups. ${worst.verdict === 'poor' || worst.verdict === 'avoid' ? `Avoid "${worst.name}" (${worst.winRate}% win rate).` : ''}`,
                metric: `70%+ of trades should be "${best.name}" setup`,
                priority: 'medium',
            });
        }
    }

    // Goal 5: Optimize trading time
    if (patterns.timeOfDay.bestHour.hour !== patterns.timeOfDay.worstHour.hour) {
        goals.push({
            goal: `Trade more during ${patterns.timeOfDay.bestHour.hour}:00 hour`,
            why: `Best performance: ${Math.round(patterns.timeOfDay.bestHour.avgPnL)} avg P&L at ${patterns.timeOfDay.bestHour.hour}:00`,
            how: `Focus on ${patterns.timeOfDay.bestHour.hour}:00-${patterns.timeOfDay.bestHour.hour + 1}:00. Reduce trades at ${patterns.timeOfDay.worstHour.hour}:00.`,
            metric: '50%+ of trades should be during best hour',
            priority: 'medium',
        });
    }

    // Sort by priority and return top 4 goals
    const priorityOrder = { critical: 1, high: 2, medium: 3 };
    return goals.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 4);
}

// ==========================================
// WEEKLY CHECK-IN & ACCOUNTABILITY
// ==========================================
export interface WeeklyCheckIn {
    weekNumber: number;
    goalsStatus: {
        goal: string;
        achieved: boolean;
        progress: number; // 0-100%
        notes: string;
    }[];
    overallImprovement: number; // 0-100%
    nextWeekFocus: string;
}

export function createWeeklyCheckIn(
    currentGoals: CoachingGoal[],
    currentWeekTrades: Trade[],
    previousWeekTrades: Trade[]
): WeeklyCheckIn {
    // Simplified implementation - in real app, you'd store goal tracking in DB
    const goalsStatus = currentGoals.map((goal) => ({
        goal: goal.goal,
        achieved: false, // Would check against actual metrics
        progress: 50, // Placeholder
        notes: 'Track progress manually for now',
    }));

    // Calculate improvement (simplified)
    const currentWinRate =
        currentWeekTrades.filter((t) => t.pnl && t.pnl > 0).length /
        currentWeekTrades.filter((t) => t.pnl !== null).length;
    const previousWinRate =
        previousWeekTrades.filter((t) => t.pnl && t.pnl > 0).length /
        previousWeekTrades.filter((t) => t.pnl !== null).length;

    const improvement = ((currentWinRate - previousWinRate) / previousWinRate) * 100;

    return {
        weekNumber: 1,
        goalsStatus,
        overallImprovement: Math.round(improvement),
        nextWeekFocus: currentGoals[0]?.goal || 'Continue current plan',
    };
}

// ==========================================
// COMPLETE COACHING SYSTEM
// ==========================================
export interface CompleteCoachingAnalysis {
    profile: TraderProfile;
    patterns: CompletePatternAnalysis;
    goals: CoachingGoal[];
    keyInsights: string[];
    emergencyWarnings: string[];
}

export function runCompleteCoachingAnalysis(
    trades: Trade[]
): CompleteCoachingAnalysis {
    // Run all pattern detectors
    const patterns = runCompletePatternAnalysis(trades);

    // Build trader profile
    const profile = buildTraderProfile(trades, patterns);

    // Generate personalized goals
    const goals = generatePersonalizedGoals(profile, patterns);

    // Extract key insights
    const keyInsights: string[] = [];
    keyInsights.push(`Trading Style: ${profile.tradingStyle.replace('_', ' ')}`);
    keyInsights.push(`Risk Tolerance: ${profile.riskTolerance}`);
    keyInsights.push(`Discipline Score: ${profile.disciplineScore}/100`);
    keyInsights.push(`Primary Strength: ${profile.primaryStrength}`);
    keyInsights.push(`Primary Weakness: ${profile.primaryWeakness}`);

    // Emergency warnings (critical issues)
    const emergencyWarnings: string[] = [];
    if (patterns.revengeTrading.totalInstances >= 5) {
        emergencyWarnings.push(
            `🚨 URGENT: ${patterns.revengeTrading.totalInstances} revenge trades detected. This is destroying your account!`
        );
    }
    if (patterns.streaks.longestLossStreak >= 6) {
        emergencyWarnings.push(
            `🚨 STOP TRADING: ${patterns.streaks.longestLossStreak} loss streak. Take a break and review your strategy.`
        );
    }
    if (profile.riskTolerance === 'aggressive' && profile.disciplineScore < 50) {
        emergencyWarnings.push(
            '🚨 DANGER: Aggressive trading + low discipline = account blow-up risk!'
        );
    }

    return {
        profile,
        patterns,
        goals,
        keyInsights,
        emergencyWarnings,
    };
}
