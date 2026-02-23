'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnimatedCard from '@/components/ui/animated-card';
import PageTransition from '@/components/ui/page-transition';
import { SkeletonCard } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Brain, Target, TrendingUp, AlertTriangle, Clock, BarChart3,
    Zap, DollarSign, Calendar, RefreshCw, Sparkles, Award
} from 'lucide-react';

interface CoachingData {
    profile: any;
    goals: any[];
    keyInsights: string[];
    emergencyWarnings: string[];
    detailedPatterns: any;
}

interface PredictiveData {
    optimalSchedule: any;
    positionSizing: any;
    riskAlerts: any[];
}

export default function AIInsightsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [coaching, setCoaching] = useState<CoachingData | null>(null);
    const [predictions, setPredictions] = useState<PredictiveData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchAIInsights();
        }
    }, [status, router]);

    const fetchAIInsights = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch coaching analysis
            const coachingRes = await fetch('/api/ai/coaching', { method: 'POST' });
            if (!coachingRes.ok) {
                const errorData = await coachingRes.json();
                throw new Error(errorData.error || 'Failed to fetch coaching data');
            }
            const coachingData = await coachingRes.json();

            // Fetch predictive insights
            const predictiveRes = await fetch('/api/ai/predictive', { method: 'POST' });
            if (!predictiveRes.ok) {
                const errorData = await predictiveRes.json();
                throw new Error(errorData.error || 'Failed to fetch predictions');
            }
            const predictiveData = await predictiveRes.json();

            setCoaching(coachingData.coaching);
            setPredictions(predictiveData.predictions);
            toast.success('AI analysis complete!');
        } catch (err: any) {
            console.error('AI Insights error:', err);
            setError(err.message);
            toast.error(err.message || 'Failed to load AI insights');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gradient mb-2">AI Trading Coach</h1>
                    <p className="text-gray-600">Loading your personalized insights...</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="glass-card text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Unable to Load AI Insights</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchAIInsights}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-smooth"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!coaching || !predictions) {
        return null;
    }

    const priorityColors = {
        critical: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
    };

    return (
        <PageTransition className="p-8 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gradient mb-2 flex items-center gap-3">
                            <Brain className="w-10 h-10" />
                            AI Trading Coach
                        </h1>
                        <p className="text-gray-600">Personalized insights from your trade data</p>
                    </div>
                    <button
                        onClick={fetchAIInsights}
                        className="glass-card glass-hover flex items-center gap-2 px-4 py-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Analysis
                    </button>
                </div>
            </div>

            {/* Emergency Warnings */}
            {coaching.emergencyWarnings && coaching.emergencyWarnings.length > 0 && (
                <AnimatedCard delay={0} className="mb-8">
                    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-xl font-bold text-red-900 mb-3">⚠️ Critical Warnings</h3>
                                <div className="space-y-2">
                                    {coaching.emergencyWarnings.map((warning: string, i: number) => (
                                        <p key={i} className="text-red-800 font-medium">{warning}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {/* Trader Profile */}
            <AnimatedCard delay={0.1} className="mb-8">
                <div className="glass-card glass-hover">
                    <div className="flex items-center gap-3 mb-6">
                        <Award className="w-6 h-6 text-purple-600" />
                        <h2 className="text-2xl font-bold">Your Trader Profile</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Trading Style</p>
                            <p className="text-xl font-bold capitalize">{coaching.profile.tradingStyle.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Risk Tolerance</p>
                            <p className="text-xl font-bold capitalize">{coaching.profile.riskTolerance}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Discipline Score</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full ${coaching.profile.disciplineScore >= 70
                                            ? 'bg-gradient-green'
                                            : coaching.profile.disciplineScore >= 50
                                                ? 'bg-gradient-orange'
                                                : 'bg-gradient-red'
                                            }`}
                                        style={{ width: `${coaching.profile.disciplineScore}%` }}
                                    />
                                </div>
                                <span className="text-xl font-bold">{coaching.profile.disciplineScore}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Avg Trades/Day</p>
                            <p className="text-xl font-bold">{coaching.profile.avgTradesPerDay.toFixed(1)}</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">💪 Primary Strength</p>
                                <p className="font-semibold text-green-700">{coaching.profile.primaryStrength}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">⚠️ Primary Weakness</p>
                                <p className="font-semibold text-red-700">{coaching.profile.primaryWeakness}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedCard>

            {/* Coaching Goals */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    Your Personalized Goals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {coaching.goals.map((goal: any, i: number) => (
                        <AnimatedCard key={i} delay={0.2 + i * 0.1}>
                            <div className="glass-card glass-hover h-full">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold flex-1">{goal.goal}</h3>
                                    <span className={`${priorityColors[goal.priority as keyof typeof priorityColors]} text-white text-xs px-3 py-1 rounded-full uppercase font-bold`}>
                                        {goal.priority}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-1">📊 Why:</p>
                                        <p className="text-sm text-gray-600">{goal.why}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-1">🎯 How:</p>
                                        <p className="text-sm text-gray-600">{goal.how}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-1">📏 Metric:</p>
                                        <p className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-2 rounded">{goal.metric}</p>
                                    </div>
                                </div>
                            </div>
                        </AnimatedCard>
                    ))}
                </div>
            </div>

            {/* Pattern Detection Grid */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Detected Patterns
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Revenge Trading */}
                    <AnimatedCard delay={0.3}>
                        <div className={`glass-card glass-hover ${coaching.detailedPatterns.revengeTrading.detected ? 'border-2 border-red-400' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <Zap className="w-5 h-5 text-red-600" />
                                <h3 className="font-bold">Revenge Trading</h3>
                            </div>
                            <p className={`text-2xl font-bold mb-2 ${coaching.detailedPatterns.revengeTrading.detected ? 'text-red-600' : 'text-green-600'}`}>
                                {coaching.detailedPatterns.revengeTrading.detected ? 'Detected' : 'Clean'}
                            </p>
                            {coaching.detailedPatterns.revengeTrading.detected && (
                                <p className="text-sm text-gray-600 mb-2">
                                    {coaching.detailedPatterns.revengeTrading.totalInstances} instances
                                </p>
                            )}
                            <p className="text-xs text-gray-500">{coaching.detailedPatterns.revengeTrading.recommendation}</p>
                        </div>
                    </AnimatedCard>

                    {/* FOMO */}
                    <AnimatedCard delay={0.35}>
                        <div className={`glass-card glass-hover ${coaching.detailedPatterns.fomo.detected ? 'border-2 border-orange-400' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="w-5 h-5 text-orange-600" />
                                <h3 className="font-bold">FOMO Entries</h3>
                            </div>
                            <p className={`text-2xl font-bold mb-2 ${coaching.detailedPatterns.fomo.detected ? 'text-orange-600' : 'text-green-600'}`}>
                                {coaching.detailedPatterns.fomo.detected ? 'Detected' : 'Clean'}
                            </p>
                            {coaching.detailedPatterns.fomo.detected && (
                                <p className="text-sm text-gray-600 mb-2">
                                    {coaching.detailedPatterns.fomo.totalInstances} instances
                                </p>
                            )}
                            <p className="text-xs text-gray-500">{coaching.detailedPatterns.fomo.recommendation}</p>
                        </div>
                    </AnimatedCard>

                    {/* Overtrading */}
                    <AnimatedCard delay={0.4}>
                        <div className={`glass-card glass-hover ${coaching.detailedPatterns.overtrading.detected ? 'border-2 border-yellow-400' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <BarChart3 className="w-5 h-5 text-yellow-600" />
                                <h3 className="font-bold">Overtrading</h3>
                            </div>
                            <p className={`text-2xl font-bold mb-2 ${coaching.detailedPatterns.overtrading.detected ? 'text-yellow-600' : 'text-green-600'}`}>
                                {coaching.detailedPatterns.overtrading.detected ? 'Detected' : 'Good Discipline'}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                Avg: {coaching.detailedPatterns.overtrading.averageTradesPerDay.toFixed(1)} trades/day
                            </p>
                            <p className="text-xs text-gray-500">{coaching.detailedPatterns.overtrading.recommendation}</p>
                        </div>
                    </AnimatedCard>

                    {/* Time Performance */}
                    <AnimatedCard delay={0.45}>
                        <div className="glass-card glass-hover">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold">Best Trading Hour</h3>
                            </div>
                            <p className="text-2xl font-bold mb-2 text-blue-600">
                                {coaching.detailedPatterns.timeOfDay.bestHour.hour}:00
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                {Math.round(coaching.detailedPatterns.timeOfDay.bestHour.winRate)}% win rate
                            </p>
                            <p className="text-xs text-gray-500">{coaching.detailedPatterns.timeOfDay.recommendation}</p>
                        </div>
                    </AnimatedCard>

                    {/* Streaks */}
                    <AnimatedCard delay={0.5}>
                        <div className="glass-card glass-hover">
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold">Win/Loss Streaks</h3>
                            </div>
                            <div className="flex gap-4 mb-2">
                                <div>
                                    <p className="text-xs text-gray-500">Longest Win</p>
                                    <p className="text-xl font-bold text-green-600">{coaching.detailedPatterns.streaks.longestWinStreak}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Longest Loss</p>
                                    <p className="text-xl font-bold text-red-600">{coaching.detailedPatterns.streaks.longestLossStreak}</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">{coaching.detailedPatterns.streaks.recommendation}</p>
                        </div>
                    </AnimatedCard>

                    {/* Best Setup */}
                    <AnimatedCard delay={0.55}>
                        <div className="glass-card glass-hover">
                            <div className="flex items-center gap-3 mb-3">
                                <Award className="w-5 h-5 text-green-600" />
                                <h3 className="font-bold">Best Setup</h3>
                            </div>
                            {coaching.detailedPatterns.setupAnalysis.setups.length > 0 && (
                                <>
                                    <p className="text-lg font-bold mb-1">{coaching.detailedPatterns.setupAnalysis.setups[0].name}</p>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {coaching.detailedPatterns.setupAnalysis.setups[0].winRate}% win rate
                                    </p>
                                    <p className="text-xs text-gray-500">{coaching.detailedPatterns.setupAnalysis.recommendation}</p>
                                </>
                            )}
                        </div>
                    </AnimatedCard>
                </div>
            </div>

            {/* Predictive Insights */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-teal-600" />
                    Predictive Insights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Optimal Schedule */}
                    <AnimatedCard delay={0.6}>
                        <div className="glass-card glass-hover">
                            <h3 className="text-lg font-bold mb-4">📅 Optimal Trading Schedule</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Best Hours:</p>
                                    <p className="font-mono font-bold text-green-700">
                                        {predictions.optimalSchedule.bestTradingHours.join(', ')}:00
                                    </p>
                                </div>
                                {predictions.optimalSchedule.worstTradingHours.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Avoid:</p>
                                        <p className="font-mono font-bold text-red-700">
                                            {predictions.optimalSchedule.worstTradingHours.join(', ')}:00
                                        </p>
                                    </div>
                                )}
                                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                                    {predictions.optimalSchedule.recommendation}
                                </p>
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Position Sizing */}
                    <AnimatedCard delay={0.65}>
                        <div className="glass-card glass-hover">
                            <h3 className="text-lg font-bold mb-4">💰 Position Sizing</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Current Avg:</span>
                                    <span className="font-mono font-bold">{predictions.positionSizing.currentAvgSize.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Recommended:</span>
                                    <span className="font-mono font-bold text-green-700">{predictions.positionSizing.recommendedSize.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Risk of Ruin:</span>
                                    <span className={`font-bold ${predictions.positionSizing.riskOfRuin > 20 ? 'text-red-600' : 'text-green-600'}`}>
                                        {predictions.positionSizing.riskOfRuin}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded">
                                    {predictions.positionSizing.reasoning}
                                </p>
                            </div>
                        </div>
                    </AnimatedCard>
                </div>
            </div>

            {/* Risk Alerts */}
            {predictions.riskAlerts && predictions.riskAlerts.length > 0 && (
                <AnimatedCard delay={0.7}>
                    <div className="glass-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            Risk Alerts
                        </h3>
                        <div className="space-y-3">
                            {predictions.riskAlerts.map((alert: any, i: number) => (
                                <div
                                    key={i}
                                    className={`p-4 rounded-lg border-l-4 ${alert.severity === 'critical'
                                        ? 'bg-red-50 border-red-500'
                                        : alert.severity === 'warning'
                                            ? 'bg-yellow-50 border-yellow-500'
                                            : 'bg-blue-50 border-blue-500'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                        <div className="flex-1">
                                            <p className="font-semibold mb-1">{alert.message}</p>
                                            <p className="text-sm text-gray-600">When to watch: {alert.whenToWatch}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>
            )}
        </PageTransition>
    );
}
