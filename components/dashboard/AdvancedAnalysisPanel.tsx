'use client';

import { useState } from 'react';
import {
    Brain, TrendingUp, TrendingDown, Clock, Calendar,
    AlertTriangle, CheckCircle, Target, BarChart3, Zap,
    Award, Loader2, ChevronDown, ChevronUp, Shield,
    Heart, Lightbulb, BookOpen, Star, ArrowRight, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuleAnalysis {
    analyzed_at: string;
    trades_analyzed: number;
    recovery_rate: number;
    revenge_trades: any[];
    discipline_score: number;
    day_analysis: {
        bestDay: { day: string; winRate: number; pnl: number };
        worstDay: { day: string; winRate: number; pnl: number };
    };
    worst_hour: { hour: number; winRate: number; pnl: number };
    recommendations: any[];
    rule_based_patterns: {
        setupPerformance: any;
        bestSetup: { name: string; winRate: number; pnl: number };
        worstSetup: { name: string; winRate: number; pnl: number };
        bestHour: { hour: number; winRate: number; pnl: number };
        maxConsecutiveLosses: number;
        totalAnalyzed: number;
    };
}

interface AIInsights {
    biggest_mistakes?: Array<{
        category: string;
        mistake: string;
        frequency: string;
        impact: string;
        how_to_fix: string;
        why_harmful: string;
        examples?: string[];
    }>;
    strongest_areas?: Array<{
        strength: string;
        evidence: string;
        how_to_leverage: string;
    }>;
    psychological_analysis?: {
        detected_patterns: string[];
        emotional_triggers: string[];
        mental_state_score: number;
        recommendations: string[];
    };
    time_based_insights?: {
        worst_trading_hours: string[];
        best_trading_hours: string[];
        worst_days: string[];
        best_days: string[];
        recommendation: string;
    };
    setup_recommendations?: {
        avoid_setups: string[];
        focus_on_setups: string[];
        setup_improvement_plan: string;
    };
    risk_management_grade?: string;
    risk_management_issues?: Array<{
        issue: string;
        severity: string;
        fix: string;
    }>;
    next_30_days_plan?: {
        immediate_actions: string[];
        weekly_goals: string[];
        habits_to_build: string[];
        habits_to_break: string[];
    };
    personalized_message?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const impactColor = (impact: string) => {
    if (impact === 'High' || impact === 'Critical') return 'bg-red-100 text-red-700 border-red-300';
    if (impact === 'Medium') return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-yellow-100 text-yellow-700 border-yellow-300';
};

const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-green-600 bg-green-100';
    if (grade === 'B') return 'text-blue-600 bg-blue-100';
    if (grade === 'C') return 'text-yellow-600 bg-yellow-100';
    if (grade === 'D') return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
};

const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
};

// ─── Collapsible Section ───────────────────────────────────────────────────────

function Section({ title, icon: Icon, id, defaultOpen = false, children, badge }: {
    title: string; icon: any; id: string; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setOpen(!open)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <span className="text-lg font-semibold text-gray-800">{title}</span>
                    {badge && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {open && <div className="px-6 pb-6 pt-2">{children}</div>}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdvancedAnalysisPanel() {
    const [ruleData, setRuleData] = useState<RuleAnalysis | null>(null);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [tradesAnalyzed, setTradesAnalyzed] = useState(0);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        setAiError(null);
        setRuleData(null);
        setAiInsights(null);

        // ── Step 1: Rule-based analysis ──────────────────────────────────────
        try {
            const res = await fetch('/api/ai/analyze-patterns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 100, days: 90 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Pattern analysis failed');
            setRuleData(data.analysis);
            setTradesAnalyzed(data.analysis?.trades_analyzed || 0);
        } catch (err: any) {
            setError(err.message || 'Failed to load pattern analysis');
            setLoading(false);
            return;
        }

        setLoading(false);

        // ── Step 2: Gemini AI Deep Analysis (runs after rule-based) ──────────
        setAiLoading(true);
        try {
            const res = await fetch('/api/analysis/advanced', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI analysis failed');
            if (data.analysis?.ai_insights) {
                setAiInsights(data.analysis.ai_insights);
            }
        } catch (err: any) {
            setAiError(err.message || 'Gemini AI analysis failed');
        } finally {
            setAiLoading(false);
        }
    };

    // ── Not yet run ──────────────────────────────────────────────────────────
    if (!loading && !ruleData && !error) {
        return (
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-10 text-center border border-purple-100">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Advanced AI Analysis</h3>
                <p className="text-gray-600 mb-2 max-w-md mx-auto">
                    Gemini AI will deeply analyze your trades and reveal:
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6 text-sm">
                    {['🚨 Biggest Mistakes', '💪 Strengths', '🧠 Psychology', '📅 30-Day Plan', '🛡️ Risk Grade', '⏰ Best Times'].map(tag => (
                        <span key={tag} className="bg-white px-3 py-1 rounded-full border border-purple-200 text-purple-700 font-medium shadow-sm">{tag}</span>
                    ))}
                </div>
                <button onClick={fetchAll}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 font-bold text-lg flex items-center gap-2 mx-auto shadow-lg transition-all transform hover:scale-105">
                    <Brain className="w-5 h-5" />
                    Run Gemini AI Analysis
                </button>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-10 text-center border border-purple-100">
                <Loader2 className="w-14 h-14 text-purple-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Trading Patterns...</h3>
                <p className="text-gray-500">Running rule-based analysis across your trades</p>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h4 className="font-bold text-red-800 mb-2">Analysis Failed</h4>
                <p className="text-red-600 mb-4 text-sm">{error}</p>
                <button onClick={fetchAll}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">
                    Retry
                </button>
            </div>
        );
    }

    if (!ruleData) return null;

    const r = ruleData;

    return (
        <div className="space-y-4">

            {/* ── Header Bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 border border-purple-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">Advanced AI Analysis Complete</p>
                        <p className="text-xs text-gray-500">{tradesAnalyzed} trades analyzed • {new Date(r.analyzed_at).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <button onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 text-sm font-medium transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Re-analyze
                </button>
            </div>

            {/* ── Quick Stats ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">Trades Analyzed</p>
                    <p className="text-3xl font-bold text-blue-700">{r.rule_based_patterns.totalAnalyzed}</p>
                </div>
                <div className={`rounded-xl p-4 border ${r.discipline_score >= 70 ? 'bg-green-50 border-green-100' : r.discipline_score >= 50 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-xs font-medium mb-1 text-gray-600">Discipline Score</p>
                    <p className={`text-3xl font-bold ${r.discipline_score >= 70 ? 'text-green-700' : r.discipline_score >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                        {r.discipline_score}<span className="text-base">/100</span>
                    </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs text-green-600 font-medium mb-1">Recovery Rate</p>
                    <p className="text-3xl font-bold text-green-700">{r.recovery_rate.toFixed(0)}%</p>
                    <p className="text-xs text-green-500">Wins after losses</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium mb-1">Max Loss Streak</p>
                    <p className="text-3xl font-bold text-orange-700">{r.rule_based_patterns.maxConsecutiveLosses}</p>
                </div>
            </div>

            {/* ── Gemini AI: Loading indicator ───────────────────────────────── */}
            {aiLoading && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 flex items-center gap-4">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin shrink-0" />
                    <div>
                        <p className="font-semibold text-purple-800">Gemini AI is analyzing your data...</p>
                        <p className="text-sm text-purple-600">Deep psychological & pattern analysis in progress</p>
                    </div>
                </div>
            )}

            {aiError && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-orange-800">Gemini AI unavailable</p>
                        <p className="text-sm text-orange-600">{aiError} — Rule-based analysis is shown below.</p>
                    </div>
                </div>
            )}

            {/* ═══════════════ GEMINI AI SECTIONS ════════════════════════════ */}
            {aiInsights && (
                <>
                    {/* Personalized Message */}
                    {aiInsights.personalized_message && (
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                            <div className="flex items-start gap-3">
                                <Star className="w-6 h-6 text-yellow-300 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-lg mb-1">Gemini's Message For You</p>
                                    <p className="text-purple-100 leading-relaxed">{aiInsights.personalized_message}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Risk Management Grade */}
                    {aiInsights.risk_management_grade && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shrink-0 ${gradeColor(aiInsights.risk_management_grade)}`}>
                                {aiInsights.risk_management_grade}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <p className="font-bold text-gray-900 text-lg">Risk Management Grade</p>
                                </div>
                                {aiInsights.risk_management_issues && aiInsights.risk_management_issues.length > 0 && (
                                    <div className="space-y-1">
                                        {aiInsights.risk_management_issues.slice(0, 3).map((issue, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${issue.severity === 'Critical' ? 'bg-red-100 text-red-700' : issue.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {issue.severity}
                                                </span>
                                                <span className="text-gray-700">{issue.issue} — <span className="text-green-700">{issue.fix}</span></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Biggest Mistakes */}
                    {aiInsights.biggest_mistakes && aiInsights.biggest_mistakes.length > 0 && (
                        <Section title="🚨 Biggest Mistakes (AI Detected)" icon={AlertTriangle} id="mistakes" defaultOpen={true}
                            badge={`${aiInsights.biggest_mistakes.length} found`}>
                            <div className="space-y-4 mt-2">
                                {aiInsights.biggest_mistakes.map((m, i) => (
                                    <div key={i} className={`border rounded-xl p-4 ${impactColor(m.impact)}`}>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/60 rounded uppercase">
                                                        {m.category}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-white/60 rounded font-semibold">
                                                        {m.impact} Impact
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-base">{m.mistake}</h4>
                                            </div>
                                        </div>
                                        <p className="text-sm mb-1 opacity-80">📊 {m.frequency}</p>
                                        <p className="text-sm mb-3 opacity-80">⚠️ {m.why_harmful}</p>
                                        <div className="bg-white/60 rounded-lg p-3 text-sm">
                                            <p className="font-semibold mb-1">✅ How To Fix:</p>
                                            <p>{m.how_to_fix}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Strengths */}
                    {aiInsights.strongest_areas && aiInsights.strongest_areas.length > 0 && (
                        <Section title="💪 Your Strengths" icon={TrendingUp} id="strengths" defaultOpen={true}
                            badge={`${aiInsights.strongest_areas.length} found`}>
                            <div className="grid md:grid-cols-2 gap-4 mt-2">
                                {aiInsights.strongest_areas.map((s, i) => (
                                    <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                            <h4 className="font-bold text-green-900">{s.strength}</h4>
                                        </div>
                                        <p className="text-sm text-green-700 mb-2">📊 {s.evidence}</p>
                                        <div className="text-sm bg-white rounded-lg p-2 border border-green-200">
                                            <span className="font-semibold text-green-800">Leverage it: </span>
                                            <span className="text-green-700">{s.how_to_leverage}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Psychological Analysis */}
                    {aiInsights.psychological_analysis && (
                        <Section title="🧠 Psychology & Mindset" icon={Brain} id="psychology" defaultOpen={true}>
                            <div className="mt-2 space-y-4">
                                {/* Mental State Score */}
                                <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                                    <div className={`text-5xl font-black ${scoreColor(aiInsights.psychological_analysis.mental_state_score)}`}>
                                        {aiInsights.psychological_analysis.mental_state_score}
                                        <span className="text-2xl text-gray-400">/10</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Mental State Score</p>
                                        <p className="text-sm text-gray-600">Based on trading behavior patterns</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {aiInsights.psychological_analysis.detected_patterns.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-orange-500" /> Detected Patterns
                                            </p>
                                            <ul className="space-y-1">
                                                {aiInsights.psychological_analysis.detected_patterns.map((p, i) => (
                                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-orange-500 mt-0.5">•</span>{p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {aiInsights.psychological_analysis.emotional_triggers.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-red-500" /> Emotional Triggers
                                            </p>
                                            <ul className="space-y-1">
                                                {aiInsights.psychological_analysis.emotional_triggers.map((t, i) => (
                                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-red-500 mt-0.5">•</span>{t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {aiInsights.psychological_analysis.recommendations.length > 0 && (
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" /> Recommendations
                                        </p>
                                        <ul className="space-y-1">
                                            {aiInsights.psychological_analysis.recommendations.map((r, i) => (
                                                <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                                    <ArrowRight className="w-3 h-3 mt-1 shrink-0" />{r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* 30-Day Action Plan */}
                    {aiInsights.next_30_days_plan && (
                        <Section title="📅 30-Day Improvement Plan" icon={Calendar} id="plan" defaultOpen={true}>
                            <div className="mt-2 grid md:grid-cols-2 gap-4">
                                {aiInsights.next_30_days_plan.immediate_actions?.length > 0 && (
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                        <p className="font-bold text-red-900 mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> Immediate Actions
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.immediate_actions.map((a, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                                                    <span className="font-bold shrink-0">{i + 1}.</span>{a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.weekly_goals?.length > 0 && (
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                        <p className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                            <Target className="w-4 h-4" /> Weekly Goals
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.weekly_goals.map((g, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                                                    <Target className="w-3 h-3 mt-1 shrink-0" />{g}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.habits_to_build?.length > 0 && (
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                        <p className="font-bold text-green-900 mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" /> Habits To Build
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.habits_to_build.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                                                    <span className="text-green-500 shrink-0">+</span>{h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.habits_to_break?.length > 0 && (
                                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                                        <p className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Habits To Break
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.habits_to_break.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                                                    <span className="text-red-500 shrink-0">−</span>{h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* Time-Based Insights from AI */}
                    {aiInsights.time_based_insights && (
                        <Section title="⏰ Best Trading Times (AI)" icon={Clock} id="ai-time">
                            <div className="mt-2 grid md:grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                    <p className="font-semibold text-green-900 mb-2">✅ Best Hours</p>
                                    <p className="text-2xl font-bold text-green-700 font-mono">
                                        {aiInsights.time_based_insights.best_trading_hours.join('  ')}
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">Best Days: {aiInsights.time_based_insights.best_days.join(', ')}</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <p className="font-semibold text-red-900 mb-2">🚫 Avoid These</p>
                                    <p className="text-2xl font-bold text-red-700 font-mono">
                                        {aiInsights.time_based_insights.worst_trading_hours.join('  ')}
                                    </p>
                                    <p className="text-sm text-red-600 mt-1">Worst Days: {aiInsights.time_based_insights.worst_days.join(', ')}</p>
                                </div>
                                <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <p className="text-sm text-blue-800">{aiInsights.time_based_insights.recommendation}</p>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Setup Recommendations */}
                    {aiInsights.setup_recommendations && (
                        <Section title="🎯 Setup Recommendations (AI)" icon={Target} id="ai-setups">
                            <div className="mt-2 space-y-3">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                        <p className="font-semibold text-red-900 mb-2">🚫 Avoid These Setups</p>
                                        <ul className="space-y-1">
                                            {aiInsights.setup_recommendations.avoid_setups.map((s, i) => (
                                                <li key={i} className="text-sm text-red-800 flex items-center gap-2">
                                                    <span>✗</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                        <p className="font-semibold text-green-900 mb-2">✅ Focus On These</p>
                                        <ul className="space-y-1">
                                            {aiInsights.setup_recommendations.focus_on_setups.map((s, i) => (
                                                <li key={i} className="text-sm text-green-800 flex items-center gap-2">
                                                    <span>✓</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                    <p className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Improvement Plan
                                    </p>
                                    <p className="text-sm text-purple-800">{aiInsights.setup_recommendations.setup_improvement_plan}</p>
                                </div>
                            </div>
                        </Section>
                    )}
                </>
            )}

            {/* ═══════════════ RULE-BASED SECTIONS ═══════════════════════════ */}

            {/* Action Items */}
            <Section title="🎯 Action Items (Rule-Based)" icon={Target} id="recommendations" defaultOpen={!aiInsights}
                badge={`${r.recommendations.length} items`}>
                <div className="space-y-3 mt-2">
                    {r.recommendations.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p>✅ No critical issues detected — Keep it up!</p>
                        </div>
                    ) : (
                        r.recommendations.map((rec, i) => (
                            <div key={i} className={`border rounded-xl p-4 ${rec.priority === 'critical' ? 'bg-red-100 border-red-300 text-red-800' : rec.priority === 'high' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/60 rounded uppercase">{rec.priority}</span>
                                    <span className="text-xs opacity-70">{rec.category}</span>
                                </div>
                                <h4 className="font-bold">{rec.action}</h4>
                                <p className="text-sm mt-1 opacity-80">{rec.reason}</p>
                                <div className="flex gap-2 text-xs mt-2">
                                    <span className="px-2 py-0.5 bg-white/60 rounded">Impact: {rec.impact}</span>
                                    <span className="px-2 py-0.5 bg-white/60 rounded">{rec.difficulty} to fix</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Section>

            {/* Setup Performance Table */}
            <Section title="📊 Setup Performance" icon={BarChart3} id="setups">
                <div className="mt-2 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold text-green-900">Best Setup</h4>
                            </div>
                            <p className="text-xl font-bold text-green-700">{r.rule_based_patterns.bestSetup.name}</p>
                            <p className="text-sm text-green-600">{r.rule_based_patterns.bestSetup.winRate.toFixed(1)}% win rate • ₹{r.rule_based_patterns.bestSetup.pnl.toFixed(0)}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                                <h4 className="font-semibold text-red-900">Worst Setup</h4>
                            </div>
                            <p className="text-xl font-bold text-red-700">{r.rule_based_patterns.worstSetup.name}</p>
                            <p className="text-sm text-red-600">{r.rule_based_patterns.worstSetup.winRate.toFixed(1)}% win rate • ₹{r.rule_based_patterns.worstSetup.pnl.toFixed(0)}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Setup', 'W', 'L', 'Win Rate', 'P&L'].map(h => (
                                        <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(r.rule_based_patterns.setupPerformance).map(([setup, stats]: [string, any]) => {
                                    const total = stats.wins + stats.losses;
                                    const wr = total > 0 ? (stats.wins / total) * 100 : 0;
                                    return (
                                        <tr key={setup} className="border-t hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium">{setup}</td>
                                            <td className="py-3 px-4 text-green-600 font-semibold">{stats.wins}</td>
                                            <td className="py-3 px-4 text-red-600 font-semibold">{stats.losses}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${wr >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {wr.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{stats.totalPnL.toFixed(0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* Time-Based Patterns */}
            <Section title="⏰ Time Patterns (Rule-Based)" icon={Clock} id="time">
                <div className="mt-2 grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-blue-800 mb-1">Best Trading Hour</p>
                        <p className="text-4xl font-black text-blue-700">{String(r.rule_based_patterns.bestHour.hour).padStart(2, '0')}:00</p>
                        <p className="text-sm text-blue-600 mt-1">{r.rule_based_patterns.bestHour.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                        <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-orange-800 mb-1">Avoid This Hour</p>
                        <p className="text-4xl font-black text-orange-700">{String(r.worst_hour.hour).padStart(2, '0')}:00</p>
                        <p className="text-sm text-orange-600 mt-1">{r.worst_hour.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-green-800 mb-1">Best Day</p>
                        <p className="text-3xl font-black text-green-700">{r.day_analysis.bestDay.day}</p>
                        <p className="text-sm text-green-600 mt-1">{r.day_analysis.bestDay.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <Calendar className="w-6 h-6 text-red-600 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-red-800 mb-1">Worst Day</p>
                        <p className="text-3xl font-black text-red-700">{r.day_analysis.worstDay.day}</p>
                        <p className="text-sm text-red-600 mt-1">{r.day_analysis.worstDay.winRate.toFixed(1)}% win rate</p>
                    </div>
                </div>
            </Section>

            {/* Behavioral Insights */}
            <Section title="🧠 Behavioral Insights" icon={Brain} id="behavioral">
                <div className="mt-2 space-y-3">
                    {r.revenge_trades.length > 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <h4 className="font-semibold text-yellow-900">Revenge Trading Detected</h4>
                                <span className="ml-auto text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                                    {r.revenge_trades.length} cases
                                </span>
                            </div>
                            <p className="text-sm text-yellow-800 mb-3">
                                {r.revenge_trades.length} trades entered within 30 min of a loss — classic revenge trading pattern.
                            </p>
                            <div className="grid md:grid-cols-3 gap-2">
                                {r.revenge_trades.slice(0, 3).map((trade, i) => (
                                    <div key={i} className="bg-white rounded-lg p-3 text-sm border border-yellow-100">
                                        <p className="font-semibold text-gray-800">{trade.symbol}</p>
                                        <p className="text-xs text-gray-500">{trade.minutesAfter} min after ₹{Math.abs(trade.afterLoss || 0).toFixed(0)} loss</p>
                                        <p className={`font-bold ${trade.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{trade.result.toFixed(0)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                            <p className="text-green-800 font-bold text-lg">✅ No Revenge Trading Detected</p>
                            <p className="text-green-600 text-sm">Excellent emotional discipline!</p>
                        </div>
                    )}
                </div>
            </Section>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 py-2">
                Analysis by Gemini AI + Rule Engine • {tradesAnalyzed} trades • {new Date(r.analyzed_at).toLocaleString('en-IN')}
            </div>
        </div>
    );
}
