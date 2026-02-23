// lib/ai/pattern-detectors.ts
// Advanced Trading Pattern Detection - 100% Free, Pure TypeScript Logic
// No API calls, no costs, just smart analysis of your trade data

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
// 1. REVENGE TRADING DETECTOR
// ==========================================
export interface RevengeTradingResult {
    detected: boolean;
    instances: {
        lossTradeId: string;
        revengeTradeId: string;
        timeBetween: number; // minutes
        positionSizeIncrease: number; // percentage
        severity: 'low' | 'medium' | 'high';
    }[];
    totalInstances: number;
    recommendation: string;
}

export function detectRevengeTrading(trades: Trade[]): RevengeTradingResult {
    const instances: RevengeTradingResult['instances'] = [];
    const sortedTrades = [...trades].sort(
        (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
    );

    for (let i = 1; i < sortedTrades.length; i++) {
        const prev = sortedTrades[i - 1];
        const curr = sortedTrades[i];

        // Check if previous trade was a loss
        if (prev.pnl && prev.pnl < 0 && prev.exit_time && curr.entry_time) {
            const timeBetween =
                (new Date(curr.entry_time).getTime() - new Date(prev.exit_time).getTime()) /
                (1000 * 60); // minutes

            // Revenge trading = trade within 30 mins of loss
            if (timeBetween < 30) {
                const prevSize = prev.entry_price * prev.quantity;
                const currSize = curr.entry_price * curr.quantity;
                const sizeIncrease = ((currSize - prevSize) / prevSize) * 100;

                let severity: 'low' | 'medium' | 'high' = 'low';
                if (timeBetween < 5) severity = 'high';
                else if (timeBetween < 15) severity = 'medium';

                if (sizeIncrease > 20) severity = 'high'; // Increased position size = more severe

                instances.push({
                    lossTradeId: prev.id,
                    revengeTradeId: curr.id,
                    timeBetween: Math.round(timeBetween),
                    positionSizeIncrease: Math.round(sizeIncrease),
                    severity,
                });
            }
        }
    }

    return {
        detected: instances.length > 0,
        instances,
        totalInstances: instances.length,
        recommendation:
            instances.length > 0
                ? `Detected ${instances.length} revenge trading instances. Wait 30+ minutes after losses before next trade.`
                : 'No revenge trading detected. Good emotional control!',
    };
}

// ==========================================
// 2. FOMO ENTRY DETECTOR
// ==========================================
export interface FOMOResult {
    detected: boolean;
    instances: {
        tradeId: string;
        symbol: string;
        entryQuality: 'late' | 'very_late';
        priceMovedPercent: number;
        hasEmotionalTags: boolean;
    }[];
    totalInstances: number;
    recommendation: string;
}

export function detectFOMO(trades: Trade[]): FOMOResult {
    const instances: FOMOResult['instances'] = [];

    trades.forEach((trade) => {
        // Check for FOMO indicators:
        // 1. Emotional tags containing FOMO-related words
        const fomoKeywords = ['fomo', 'fear', 'missing', 'rush', 'hurry', 'quick'];
        const hasEmotionalTags =
            trade.emotions?.some((e) =>
                fomoKeywords.some((kw) => e.toLowerCase().includes(kw))
            ) ||
            trade.reason?.toLowerCase().includes('fomo') ||
            false;

        // 2. Late entry (no stop loss + no clear reason = impulsive)
        const isImpulsive = !trade.stop_loss && !trade.reason;

        // 3. Could check price movement if we had historical data
        // For now, use proxy: very large position without stop loss
        const positionSize = trade.entry_price * trade.quantity;
        const isLargeNoStop = positionSize > 10000 && !trade.stop_loss;

        if (hasEmotionalTags || (isImpulsive && isLargeNoStop)) {
            instances.push({
                tradeId: trade.id,
                symbol: trade.symbol,
                entryQuality: isLargeNoStop ? 'very_late' : 'late',
                priceMovedPercent: 0, // Would need historical data
                hasEmotionalTags,
            });
        }
    });

    return {
        detected: instances.length > 0,
        instances,
        totalInstances: instances.length,
        recommendation:
            instances.length > 0
                ? `${instances.length} FOMO entries detected. Set alerts at key levels instead of chasing.`
                : 'Patient entries detected. Keep waiting for your setups!',
    };
}

// ==========================================
// 3. OVERTRADING DETECTOR
// ==========================================
export interface OvertradingResult {
    detected: boolean;
    overtradingDays: {
        date: string;
        tradeCount: number;
        winRate: number;
        totalPnL: number;
    }[];
    averageTradesPerDay: number;
    recommendation: string;
}

export function detectOvertrading(trades: Trade[]): OvertradingResult {
    const tradesByDate = new Map<string, Trade[]>();

    trades.forEach((trade) => {
        const date = trade.entry_time.split('T')[0];
        if (!tradesByDate.has(date)) {
            tradesByDate.set(date, []);
        }
        tradesByDate.get(date)!.push(trade);
    });

    const overtradingDays: OvertradingResult['overtradingDays'] = [];
    let totalTradeDays = 0;
    let totalTrades = 0;

    tradesByDate.forEach((dayTrades, date) => {
        totalTradeDays++;
        totalTrades += dayTrades.length;

        if (dayTrades.length > 5) {
            // Overtrading threshold: >5 trades/day
            const closedTrades = dayTrades.filter((t) => t.pnl !== null);
            const wins = closedTrades.filter((t) => (t.pnl || 0) > 0).length;
            const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
            const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

            overtradingDays.push({
                date,
                tradeCount: dayTrades.length,
                winRate: Math.round(winRate),
                totalPnL: Math.round(totalPnL),
            });
        }
    });

    const avgTradesPerDay = totalTradeDays > 0 ? totalTrades / totalTradeDays : 0;

    return {
        detected: overtradingDays.length > 0,
        overtradingDays,
        averageTradesPerDay: Math.round(avgTradesPerDay * 10) / 10,
        recommendation:
            overtradingDays.length > 0
                ? `Overtrading detected on ${overtradingDays.length} days. Limit to max 5 high-quality trades per day.`
                : `Good discipline! Average ${avgTradesPerDay.toFixed(1)} trades/day is sustainable.`,
    };
}

// ==========================================
// 4. TIME-OF-DAY PERFORMANCE ANALYZER
// ==========================================
export interface TimeOfDayResult {
    hourlyPerformance: {
        hour: number;
        tradeCount: number;
        winRate: number;
        avgPnL: number;
        totalPnL: number;
    }[];
    bestHour: { hour: number; winRate: number; avgPnL: number };
    worstHour: { hour: number; winRate: number; avgPnL: number };
    recommendation: string;
}

export function analyzeTimeOfDay(trades: Trade[]): TimeOfDayResult {
    const hourlyData = new Map<
        number,
        { trades: Trade[]; wins: number; totalPnL: number }
    >();

    // Initialize all trading hours (9 AM to 3:30 PM IST typical)
    for (let h = 9; h <= 15; h++) {
        hourlyData.set(h, { trades: [], wins: 0, totalPnL: 0 });
    }

    trades.forEach((trade) => {
        const hour = new Date(trade.entry_time).getHours();
        if (!hourlyData.has(hour)) {
            hourlyData.set(hour, { trades: [], wins: 0, totalPnL: 0 });
        }

        const data = hourlyData.get(hour)!;
        data.trades.push(trade);
        if (trade.pnl && trade.pnl > 0) data.wins++;
        data.totalPnL += trade.pnl || 0;
    });

    const hourlyPerformance: TimeOfDayResult['hourlyPerformance'] = [];
    let bestHour = { hour: 10, winRate: 0, avgPnL: 0 };
    let worstHour = { hour: 10, winRate: 100, avgPnL: 0 };

    hourlyData.forEach((data, hour) => {
        if (data.trades.length > 0) {
            const closedTrades = data.trades.filter((t) => t.pnl !== null);
            const winRate =
                closedTrades.length > 0 ? (data.wins / closedTrades.length) * 100 : 0;
            const avgPnL = closedTrades.length > 0 ? data.totalPnL / closedTrades.length : 0;

            hourlyPerformance.push({
                hour,
                tradeCount: data.trades.length,
                winRate: Math.round(winRate),
                avgPnL: Math.round(avgPnL),
                totalPnL: Math.round(data.totalPnL),
            });

            if (closedTrades.length >= 3) {
                // Need statistically significant data
                if (avgPnL > bestHour.avgPnL) {
                    bestHour = { hour, winRate, avgPnL };
                }
                if (avgPnL < worstHour.avgPnL) {
                    worstHour = { hour, winRate, avgPnL };
                }
            }
        }
    });

    return {
        hourlyPerformance,
        bestHour,
        worstHour,
        recommendation: `Best trading: ${bestHour.hour}:00 (${Math.round(bestHour.avgPnL)} avg). Avoid: ${worstHour.hour}:00 hours.`,
    };
}

// ==========================================
// 5. WINNING/LOSING STREAK DETECTOR
// ==========================================
export interface StreakResult {
    winningStreaks: {
        length: number;
        startDate: string;
        endDate: string;
        totalPnL: number;
    }[];
    losingStreaks: {
        length: number;
        startDate: string;
        endDate: string;
        totalPnL: number;
        psychologicalRisk: 'low' | 'medium' | 'high';
    }[];
    longestWinStreak: number;
    longestLossStreak: number;
    recommendation: string;
}

export function detectStreaks(trades: Trade[]): StreakResult {
    const sortedTrades = [...trades]
        .filter((t) => t.pnl !== null)
        .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    const winningStreaks: StreakResult['winningStreaks'] = [];
    const losingStreaks: StreakResult['losingStreaks'] = [];

    let currentStreak: { type: 'win' | 'loss'; trades: Trade[] } | null = null;

    sortedTrades.forEach((trade) => {
        const isWin = (trade.pnl || 0) > 0;

        if (!currentStreak) {
            currentStreak = { type: isWin ? 'win' : 'loss', trades: [trade] };
        } else if ((currentStreak.type === 'win') === isWin) {
            currentStreak.trades.push(trade);
        } else {
            // Streak ended, save if >= 3
            if (currentStreak.trades.length >= 3) {
                const totalPnL = currentStreak.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                if (currentStreak.type === 'win') {
                    winningStreaks.push({
                        length: currentStreak.trades.length,
                        startDate: currentStreak.trades[0].entry_time.split('T')[0],
                        endDate:
                            currentStreak.trades[currentStreak.trades.length - 1].entry_time.split(
                                'T'
                            )[0],
                        totalPnL: Math.round(totalPnL),
                    });
                } else {
                    let psychologicalRisk: 'low' | 'medium' | 'high' = 'low';
                    if (currentStreak.trades.length >= 5) psychologicalRisk = 'high';
                    else if (currentStreak.trades.length >= 4) psychologicalRisk = 'medium';

                    losingStreaks.push({
                        length: currentStreak.trades.length,
                        startDate: currentStreak.trades[0].entry_time.split('T')[0],
                        endDate:
                            currentStreak.trades[currentStreak.trades.length - 1].entry_time.split(
                                'T'
                            )[0],
                        totalPnL: Math.round(totalPnL),
                        psychologicalRisk,
                    });
                }
            }
            currentStreak = { type: isWin ? 'win' : 'loss', trades: [trade] };
        }
    });

    // Check final streak
    if (currentStreak !== null && (currentStreak as { type: 'win' | 'loss'; trades: Trade[] }).trades.length >= 3) {
        const streakTrades = (currentStreak as { type: 'win' | 'loss'; trades: Trade[] }).trades;
        const streakType = (currentStreak as { type: 'win' | 'loss'; trades: Trade[] }).type;
        const totalPnL = streakTrades.reduce((sum: number, t: Trade) => sum + (t.pnl || 0), 0);

        if (streakType === 'win') {
            winningStreaks.push({
                length: streakTrades.length,
                startDate: streakTrades[0].entry_time.split('T')[0],
                endDate:
                    streakTrades[streakTrades.length - 1].entry_time.split('T')[0],
                totalPnL: Math.round(totalPnL),
            });
        } else {
            let psychologicalRisk: 'low' | 'medium' | 'high' = 'low';
            if (streakTrades.length >= 5) psychologicalRisk = 'high';
            else if (streakTrades.length >= 4) psychologicalRisk = 'medium';

            losingStreaks.push({
                length: streakTrades.length,
                startDate: streakTrades[0].entry_time.split('T')[0],
                endDate:
                    streakTrades[streakTrades.length - 1].entry_time.split('T')[0],
                totalPnL: Math.round(totalPnL),
                psychologicalRisk,
            });
        }
    }

    const longestWinStreak = winningStreaks.reduce(
        (max, s) => Math.max(max, s.length),
        0
    );
    const longestLossStreak = losingStreaks.reduce(
        (max, s) => Math.max(max, s.length),
        0
    );

    return {
        winningStreaks,
        losingStreaks,
        longestWinStreak,
        longestLossStreak,
        recommendation:
            longestLossStreak >= 4
                ? `Longest losing streak: ${longestLossStreak} trades. Take a break after 3 consecutive losses.`
                : `Streaks managed well. Max loss streak: ${longestLossStreak}.`,
    };
}

// ==========================================
// 6. SETUP TYPE SUCCESS ANALYZER
// ==========================================
export interface SetupAnalysisResult {
    setups: {
        name: string;
        tradeCount: number;
        winRate: number;
        avgPnL: number;
        totalPnL: number;
        confidenceScore: number; // 0-100, based on sample size
        verdict: 'excellent' | 'good' | 'average' | 'poor' | 'avoid';
    }[];
    bestSetup: string;
    worstSetup: string;
    recommendation: string;
}

export function analyzeSetupTypes(trades: Trade[]): SetupAnalysisResult {
    const setupData = new Map<
        string,
        { trades: Trade[]; wins: number; totalPnL: number }
    >();

    trades.forEach((trade) => {
        const setup = trade.setup_type || 'unknown';
        if (!setupData.has(setup)) {
            setupData.set(setup, { trades: [], wins: 0, totalPnL: 0 });
        }

        const data = setupData.get(setup)!;
        data.trades.push(trade);
        if (trade.pnl && trade.pnl > 0) data.wins++;
        data.totalPnL += trade.pnl || 0;
    });

    const setups: SetupAnalysisResult['setups'] = [];
    let bestSetup = { name: 'none', avgPnL: -Infinity };
    let worstSetup = { name: 'none', avgPnL: Infinity };

    setupData.forEach((data, name) => {
        const closedTrades = data.trades.filter((t) => t.pnl !== null);
        if (closedTrades.length > 0) {
            const winRate = (data.wins / closedTrades.length) * 100;
            const avgPnL = data.totalPnL / closedTrades.length;

            // Confidence score based on sample size
            let confidenceScore = Math.min(closedTrades.length * 10, 100);

            // Verdict based on win rate and avg PnL
            let verdict: 'excellent' | 'good' | 'average' | 'poor' | 'avoid';
            if (avgPnL > 500 && winRate > 60) verdict = 'excellent';
            else if (avgPnL > 200 && winRate > 50) verdict = 'good';
            else if (avgPnL > 0) verdict = 'average';
            else if (avgPnL > -200) verdict = 'poor';
            else verdict = 'avoid';

            setups.push({
                name,
                tradeCount: closedTrades.length,
                winRate: Math.round(winRate),
                avgPnL: Math.round(avgPnL),
                totalPnL: Math.round(data.totalPnL),
                confidenceScore,
                verdict,
            });

            if (closedTrades.length >= 5) {
                // Statistically significant
                if (avgPnL > bestSetup.avgPnL) {
                    bestSetup = { name, avgPnL };
                }
                if (avgPnL < worstSetup.avgPnL) {
                    worstSetup = { name, avgPnL };
                }
            }
        }
    });

    return {
        setups: setups.sort((a, b) => b.avgPnL - a.avgPnL), // Best first
        bestSetup: bestSetup.name,
        worstSetup: worstSetup.name,
        recommendation: `Focus on "${bestSetup.name}" setup. ${worstSetup.name !== 'none' ? `Avoid "${worstSetup.name}".` : ''}`,
    };
}

// ==========================================
// 7. RISK-REWARD RATIO TRENDS
// ==========================================
export interface RiskRewardResult {
    trades: {
        tradeId: string;
        plannedRR: number;
        actualRR: number;
        deviation: number;
    }[];
    avgPlannedRR: number;
    avgActualRR: number;
    disciplineScore: number; // 0-100, how often they stick to plan
    recommendation: string;
}

export function analyzeRiskReward(trades: Trade[]): RiskRewardResult {
    const rrTrades: RiskRewardResult['trades'] = [];
    let totalPlannedRR = 0;
    let totalActualRR = 0;
    let count = 0;
    let disciplineSum = 0;

    trades.forEach((trade) => {
        if (
            trade.stop_loss &&
            trade.target_price &&
            trade.exit_price &&
            trade.pnl !== null
        ) {
            const risk = Math.abs(trade.entry_price - trade.stop_loss);
            const plannedReward = Math.abs(trade.target_price - trade.entry_price);
            const actualReward = Math.abs(trade.exit_price - trade.entry_price);

            if (risk > 0) {
                const plannedRR = plannedReward / risk;
                const actualRR = actualReward / risk;
                const deviation = Math.abs(plannedRR - actualRR);

                rrTrades.push({
                    tradeId: trade.id,
                    plannedRR: Math.round(plannedRR * 100) / 100,
                    actualRR: Math.round(actualRR * 100) / 100,
                    deviation: Math.round(deviation * 100) / 100,
                });

                totalPlannedRR += plannedRR;
                totalActualRR += actualRR;

                // Good discipline = actual close to planned
                if (deviation < 0.5) disciplineSum += 100;
                else if (deviation < 1) disciplineSum += 70;
                else if (deviation < 2) disciplineSum += 40;

                count++;
            }
        }
    });

    const avgPlannedRR = count > 0 ? totalPlannedRR / count : 0;
    const avgActualRR = count > 0 ? totalActualRR / count : 0;
    const disciplineScore = count > 0 ? Math.round(disciplineSum / count) : 0;

    return {
        trades: rrTrades,
        avgPlannedRR: Math.round(avgPlannedRR * 100) / 100,
        avgActualRR: Math.round(avgActualRR * 100) / 100,
        disciplineScore,
        recommendation:
            disciplineScore < 60
                ? `Low discipline (${disciplineScore}/100). Stick to your planned targets and stop losses.`
                : `Good discipline (${disciplineScore}/100). You follow your plan well.`,
    };
}

// ==========================================
// 8. HOLDING TIME PATTERN ANALYZER
// ==========================================
export interface HoldingTimeResult {
    avgHoldingTimeMinutes: number;
    winningTradesAvgHold: number;
    losingTradesAvgHold: number;
    quickExitPattern: boolean; // Exit too fast
    recommendation: string;
}

export function analyzeHoldingTime(trades: Trade[]): HoldingTimeResult {
    const closedTrades = trades.filter((t) => t.exit_time && t.pnl !== null);

    let totalHoldTime = 0;
    let winHoldTime = 0;
    let lossHoldTime = 0;
    let winCount = 0;
    let lossCount = 0;

    closedTrades.forEach((trade) => {
        const holdTime =
            (new Date(trade.exit_time!).getTime() - new Date(trade.entry_time).getTime()) /
            (1000 * 60); // minutes

        totalHoldTime += holdTime;

        if (trade.pnl! > 0) {
            winHoldTime += holdTime;
            winCount++;
        } else {
            lossHoldTime += holdTime;
            lossCount++;
        }
    });

    const avgHoldingTimeMinutes =
        closedTrades.length > 0 ? totalHoldTime / closedTrades.length : 0;
    const winningTradesAvgHold = winCount > 0 ? winHoldTime / winCount : 0;
    const losingTradesAvgHold = lossCount > 0 ? lossHoldTime / lossCount : 0;

    // Pattern: Cutting winners short, letting losers run
    const quickExitPattern =
        winningTradesAvgHold > 0 &&
        losingTradesAvgHold > 0 &&
        losingTradesAvgHold > winningTradesAvgHold * 1.5;

    return {
        avgHoldingTimeMinutes: Math.round(avgHoldingTimeMinutes),
        winningTradesAvgHold: Math.round(winningTradesAvgHold),
        losingTradesAvgHold: Math.round(losingTradesAvgHold),
        quickExitPattern,
        recommendation: quickExitPattern
            ? `You cut winners (${Math.round(winningTradesAvgHold)}min) but hold losers (${Math.round(losingTradesAvgHold)}min). Let winners run!`
            : `Good holding pattern. Winners: ${Math.round(winningTradesAvgHold)}min, Losers: ${Math.round(losingTradesAvgHold)}min.`,
    };
}

// ==========================================
// 9. MARKET CONDITION CORRELATOR
// ==========================================
export interface MarketConditionResult {
    dayOfWeekPerformance: {
        day: string;
        tradeCount: number;
        winRate: number;
        avgPnL: number;
    }[];
    bestDay: string;
    worstDay: string;
    recommendation: string;
}

export function analyzeMarketConditions(trades: Trade[]): MarketConditionResult {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = new Map<number, { trades: Trade[]; wins: number; totalPnL: number }>();

    // Initialize weekdays (Mon-Fri)
    for (let d = 1; d <= 5; d++) {
        dayData.set(d, { trades: [], wins: 0, totalPnL: 0 });
    }

    trades.forEach((trade) => {
        const dayOfWeek = new Date(trade.entry_time).getDay();
        if (!dayData.has(dayOfWeek)) {
            dayData.set(dayOfWeek, { trades: [], wins: 0, totalPnL: 0 });
        }

        const data = dayData.get(dayOfWeek)!;
        data.trades.push(trade);
        if (trade.pnl && trade.pnl > 0) data.wins++;
        data.totalPnL += trade.pnl || 0;
    });

    const dayOfWeekPerformance: MarketConditionResult['dayOfWeekPerformance'] = [];
    let bestDay = { name: 'Monday', avgPnL: -Infinity };
    let worstDay = { name: 'Monday', avgPnL: Infinity };

    dayData.forEach((data, dayNum) => {
        if (data.trades.length > 0) {
            const closedTrades = data.trades.filter((t) => t.pnl !== null);
            const winRate =
                closedTrades.length > 0 ? (data.wins / closedTrades.length) * 100 : 0;
            const avgPnL = closedTrades.length > 0 ? data.totalPnL / closedTrades.length : 0;

            dayOfWeekPerformance.push({
                day: dayNames[dayNum],
                tradeCount: data.trades.length,
                winRate: Math.round(winRate),
                avgPnL: Math.round(avgPnL),
            });

            if (closedTrades.length >= 3) {
                if (avgPnL > bestDay.avgPnL) {
                    bestDay = { name: dayNames[dayNum], avgPnL };
                }
                if (avgPnL < worstDay.avgPnL) {
                    worstDay = { name: dayNames[dayNum], avgPnL };
                }
            }
        }
    });

    return {
        dayOfWeekPerformance,
        bestDay: bestDay.name,
        worstDay: worstDay.name,
        recommendation: `Best day: ${bestDay.name}. ${worstDay.avgPnL < 0 ? `Avoid trading on ${worstDay.name}.` : ''}`,
    };
}

// ==========================================
// MASTER FUNCTION - RUN ALL DETECTORS
// ==========================================
export interface CompletePatternAnalysis {
    revengeTrading: RevengeTradingResult;
    fomo: FOMOResult;
    overtrading: OvertradingResult;
    timeOfDay: TimeOfDayResult;
    streaks: StreakResult;
    setupAnalysis: SetupAnalysisResult;
    riskReward: RiskRewardResult;
    holdingTime: HoldingTimeResult;
    marketConditions: MarketConditionResult;
}

export function runCompletePatternAnalysis(
    trades: Trade[]
): CompletePatternAnalysis {
    return {
        revengeTrading: detectRevengeTrading(trades),
        fomo: detectFOMO(trades),
        overtrading: detectOvertrading(trades),
        timeOfDay: analyzeTimeOfDay(trades),
        streaks: detectStreaks(trades),
        setupAnalysis: analyzeSetupTypes(trades),
        riskReward: analyzeRiskReward(trades),
        holdingTime: analyzeHoldingTime(trades),
        marketConditions: analyzeMarketConditions(trades),
    };
}
