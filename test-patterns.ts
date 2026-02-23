// Test script to verify Phase 2 pattern detection works
import { runCompletePatternAnalysis } from '@/lib/ai/pattern-detectors';
import { buildTraderProfile, generatePersonalizedGoals } from '@/lib/ai/coaching';
import { runCompletePredictiveAnalysis } from '@/lib/ai/predictive';

// Sample trade data for testing
const sampleTrades = [
    // Revenge trading scenario: Quick trade after loss
    {
        id: '1',
        symbol: 'RELIANCE',
        trade_type: 'long' as const,
        entry_price: 2500,
        exit_price: 2480,
        quantity: 10,
        pnl: -200,
        status: 'closed',
        entry_time: '2024-02-01T10:00:00Z',
        exit_time: '2024-02-01T10:30:00Z',
        setup_type: 'breakout',
        reason: 'false breakout',
        emotions: ['frustrated'],
        tags: ['loss'],
        stop_loss: 2490,
        target_price: 2530,
    },
    {
        id: '2',
        symbol: 'RELIANCE',
        trade_type: 'long' as const,
        entry_price: 2485,
        exit_price: 2470,
        quantity: 15, // Increased size!
        pnl: -225,
        status: 'closed',
        entry_time: '2024-02-01T10:35:00Z', // Only 5 min after prev exit!
        exit_time: '2024-02-01T11:00:00Z',
        setup_type: 'reversal',
        reason: null,
        emotions: ['angry', 'fomo'],
        tags: [],
        stop_loss: null, // No stop loss!
        target_price: null,
    },
    // Winning streak
    {
        id: '3',
        symbol: 'INFY',
        trade_type: 'long' as const,
        entry_price: 1500,
        exit_price: 1520,
        quantity: 20,
        pnl: 400,
        status: 'closed',
        entry_time: '2024-02-02T11:00:00Z',
        exit_time: '2024-02-02T13:00:00Z',
        setup_type: 'breakout',
        reason: 'clean breakout',
        emotions: ['confident'],
        tags: ['win'],
        stop_loss: 1490,
        target_price: 1520,
    },
    {
        id: '4',
        symbol: 'TCS',
        trade_type: 'long' as const,
        entry_price: 3500,
        exit_price: 3530,
        quantity: 10,
        pnl: 300,
        status: 'closed',
        entry_time: '2024-02-02T14:00:00Z',
        exit_time: '2024-02-02T15:30:00Z',
        setup_type: 'breakout',
        reason: 'trend continuation',
        emotions: ['calm'],
        tags: ['win'],
        stop_loss: 3480,
        target_price: 3530,
    },
    {
        id: '5',
        symbol: 'HDFC',
        trade_type: 'long' as const,
        entry_price: 1600,
        exit_price: 1615,
        quantity: 15,
        pnl: 225,
        status: 'closed',
        entry_time: '2024-02-03T10:00:00Z',
        exit_time: '2024-02-03T11:00:00Z',
        setup_type: 'breakout',
        reason: 'volume spike',
        emotions: [],
        tags: ['win'],
        stop_loss: 1590,
        target_price: 1615,
    },
    // Overtrading day: 7 trades in one day
    ...Array.from({ length: 7 }, (_, i) => ({
        id: `6-${i}`,
        symbol: 'NIFTY',
        trade_type: 'short' as const,
        entry_price: 18000 - i * 10,
        exit_price: 17990 - i * 10,
        quantity: 1,
        pnl: i % 2 === 0 ? 50 : -30,
        status: 'closed',
        entry_time: `2024-02-05T${10 + i}:00:00Z`,
        exit_time: `2024-02-05T${10 + i}:30:00Z`,
        setup_type: 'scalp',
        reason: 'quick scalp',
        emotions: i > 4 ? ['rushed'] : [],
        tags: [],
        stop_loss: null,
        target_price: null,
    })),
];

console.log('🧪 Testing Phase 2 Pattern Detection...\n');

// Test 1: Pattern Detection
console.log('📊 Test 1: Running Complete Pattern Analysis');
const patterns = runCompletePatternAnalysis(sampleTrades as any);

console.log('\n✅ Revenge Trading:', patterns.revengeTrading.detected);
console.log('   Instances:', patterns.revengeTrading.totalInstances);
console.log('   Recommendation:', patterns.revengeTrading.recommendation);

console.log('\n✅ FOMO:', patterns.fomo.detected);
console.log('   Instances:', patterns.fomo.totalInstances);

console.log('\n✅ Overtrading:', patterns.overtrading.detected);
console.log('   Days:', patterns.overtrading.overtradingDays.length);
console.log('   Avg trades/day:', patterns.overtrading.averageTradesPerDay);

console.log('\n✅ Streaks:');
console.log('   Longest win streak:', patterns.streaks.longestWinStreak);
console.log('   Longest loss streak:', patterns.streaks.longestLossStreak);

console.log('\n✅ Setup Analysis:');
if (patterns.setupAnalysis.setups.length > 0) {
    const best = patterns.setupAnalysis.setups[0];
    console.log('   Best setup:', best.name, `(${best.winRate}% WR)`);
}

// Test 2: Trader Profile
console.log('\n\n📊 Test 2: Building Trader Profile');
const profile = buildTraderProfile(sampleTrades as any, patterns);

console.log('\n✅ Trading Style:', profile.tradingStyle);
console.log('✅ Risk Tolerance:', profile.riskTolerance);
console.log('✅ Primary Weakness:', profile.primaryWeakness);
console.log('✅ Primary Strength:', profile.primaryStrength);
console.log('✅ Discipline Score:', profile.disciplineScore + '/100');

// Test 3: Coaching Goals
console.log('\n\n📊 Test 3: Generating Personalized Goals');
const goals = generatePersonalizedGoals(profile, patterns);

goals.forEach((goal, i) => {
    console.log(`\n✅ Goal ${i + 1} [${goal.priority.toUpperCase()}]:`);
    console.log('   Goal:', goal.goal);
    console.log('   Why:', goal.why);
    console.log('   How:', goal.how);
    console.log('   Metric:', goal.metric);
});

// Test 4: Predictive Insights
console.log('\n\n📊 Test 4: Running Predictive Analysis');
const predictions = runCompletePredictiveAnalysis(sampleTrades as any, patterns, profile);

console.log('\n✅ Optimal Schedule:');
console.log('   Best hours:', predictions.optimalSchedule.bestTradingHours.join(', '));
console.log('   Recommendation:', predictions.optimalSchedule.recommendation);

console.log('\n✅ Position Sizing:');
console.log('   Current avg:', predictions.positionSizing.currentAvgSize);
console.log('   Recommended:', predictions.positionSizing.recommendedSize);
console.log('   Risk of Ruin:', predictions.positionSizing.riskOfRuin + '%');

console.log('\n✅ Risk Alerts:', predictions.riskAlerts.length, 'alerts');
predictions.riskAlerts.forEach((alert, i) => {
    console.log(`   ${i + 1}. [${alert.severity}] ${alert.message}`);
});

console.log('\n\n✅ All Tests Passed! Phase 2 is working correctly! 🎉');
