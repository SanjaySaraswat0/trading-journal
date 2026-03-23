'use client';

import { useState, useEffect } from 'react';
import {
    Brain, TrendingUp, TrendingDown, Clock, Calendar,
    AlertTriangle, CheckCircle, Target, BarChart3, Zap,
    Award, Loader2, ChevronDown, ChevronUp, Shield,
    Heart, Lightbulb, BookOpen, Star, ArrowRight, RefreshCw,
    Sparkles, Activity, TrendingFlat,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const impactColor = (impact: string) => {
    if (impact === 'High' || impact === 'Critical')
        return 'border-l-red-500 bg-gradient-to-r from-red-950/60 to-slate-900/80 text-red-100';
    if (impact === 'Medium')
        return 'border-l-orange-500 bg-gradient-to-r from-orange-950/60 to-slate-900/80 text-orange-100';
    return 'border-l-yellow-500 bg-gradient-to-r from-yellow-950/40 to-slate-900/80 text-yellow-100';
};

const impactBadge = (impact: string) => {
    if (impact === 'High' || impact === 'Critical')
        return 'bg-red-500/20 text-red-300 border border-red-500/40';
    if (impact === 'Medium')
        return 'bg-orange-500/20 text-orange-300 border border-orange-500/40';
    return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
};

const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    if (grade === 'B') return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    if (grade === 'C') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    if (grade === 'D') return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    return 'text-red-400 bg-red-400/10 border-red-400/30';
};

// ─── SVG Score Ring ────────────────────────────────────────────────────────────

function ScoreRing({ score, max = 100, label, size = 80 }: { score: number; max?: number; label: string; size?: number }) {
    const pct = Math.min(score / max, 1);
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const dash = circ * pct;
    const color = pct >= 0.7 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                />
            </svg>
            <div style={{ marginTop: -size * 0.62, position: 'relative', zIndex: 1, textAlign: 'center', transform: 'none', lineHeight: 1 }}>
                <div className="font-black text-white" style={{ fontSize: size * 0.22 }}>{score}</div>
                <div className="text-slate-400" style={{ fontSize: size * 0.12 }}>/{max}</div>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
        </div>
    );
}

// ─── Animated Score Ring (fixes SVG layout) ────────────────────────────────────

function RingCard({ score, max = 100, label, subtitle }: { score: number; max?: number; label: string; subtitle?: string }) {
    const pct = Math.min(score / max, 1);
    const size = 88;
    const r = 34;
    const circ = 2 * Math.PI * r;
    const dash = circ * pct;
    const stroke = pct >= 0.7 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444';
    const textColor = pct >= 0.7 ? 'text-emerald-400' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400';

    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke={stroke} strokeWidth="8"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-black ${textColor}`}>{score}</span>
                    <span className="text-xs text-slate-500">/{max}</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-semibold text-white">{label}</p>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
        </div>
    );
}

// ─── Collapsible Section ───────────────────────────────────────────────────────

function Section({ title, icon: Icon, id, defaultOpen = false, children, badge, accentColor = 'purple' }: {
    title: string; icon: any; id: string; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; accentColor?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const accentMap: any = {
        purple: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
        red: 'text-red-400 border-red-500/30 bg-red-500/5',
        green: 'text-green-400 border-green-500/30 bg-green-500/5',
        blue: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
        amber: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
        orange: 'text-orange-400 border-orange-500/30 bg-orange-500/5',
    };
    const ac = accentMap[accentColor] || accentMap.purple;

    return (
        <div className={`rounded-2xl border overflow-hidden ${ac}`}>
            <button onClick={() => setOpen(!open)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ac}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-base font-bold text-white">{title}</span>
                    {badge && (
                        <span className="text-xs px-2.5 py-0.5 bg-white/10 text-slate-300 rounded-full font-semibold border border-white/10">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="text-slate-500">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>
            {open && <div className="px-5 pb-5 pt-1">{children}</div>}
        </div>
    );
}

// ─── Loading Step Indicator ────────────────────────────────────────────────────

const LOAD_STEPS = [
    { label: 'Fetching your trades', icon: Activity },
    { label: 'Running Pattern Engine', icon: BarChart3 },
    { label: 'Gemini AI thinking...', icon: Brain },
];

function LoadingPanel({ step }: { step: number }) {
    return (
        <div className="bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 rounded-2xl p-10 text-center border border-purple-500/20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Analyzing your trading data…</h3>
            <p className="text-slate-400 text-sm mb-8">This may take 20-40 seconds</p>

            <div className="max-w-sm mx-auto space-y-3">
                {LOAD_STEPS.map((s, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-purple-500/15 border border-purple-500/30' : done ? 'opacity-50' : 'opacity-30'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/20 border border-emerald-500/40' : active ? 'bg-purple-500/20 border border-purple-400/50' : 'bg-slate-700 border border-slate-600'}`}>
                                {done
                                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    : active
                                        ? <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                                        : <s.icon className="w-3.5 h-3.5 text-slate-500" />
                                }
                            </div>
                            <span className={`text-sm font-medium ${active ? 'text-purple-200' : done ? 'text-emerald-400' : 'text-slate-500'}`}>{s.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="mt-8 max-w-sm mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                    style={{ width: `${((step + 1) / LOAD_STEPS.length) * 100}%` }}
                />
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdvancedAnalysisPanel() {
    const [ruleData, setRuleData] = useState<RuleAnalysis | null>(null);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [loadStep, setLoadStep] = useState(-1);          // -1 = idle, 0/1/2 = steps
    const [error, setError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [tradesAnalyzed, setTradesAnalyzed] = useState(0);

    const fetchAll = async () => {
        setError(null);
        setAiError(null);
        setRuleData(null);
        setAiInsights(null);
        setLoadStep(0);

        // Step 1
        let ruleResult: RuleAnalysis | null = null;
        try {
            const res = await fetch('/api/ai/analyze-patterns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 100, days: 90 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Pattern analysis failed');
            ruleResult = data.analysis;
            setRuleData(data.analysis);
            setTradesAnalyzed(data.analysis?.trades_analyzed || 0);
        } catch (err: any) {
            setError(err.message || 'Failed to load pattern analysis');
            setLoadStep(-1);
            return;
        }

        setLoadStep(1);
        await new Promise(r => setTimeout(r, 400));
        setLoadStep(2);

        // Step 2
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
            setLoadStep(-1);
        }
    };

    // ── Not yet run ──────────────────────────────────────────────────────────
    if (loadStep === -1 && !ruleData && !error) {
        return (
            <div className="relative bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 rounded-2xl p-10 text-center border border-purple-500/20 overflow-hidden">
                {/* Bg glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
                </div>

                {/* Icon */}
                <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                </div>

                <div className="relative">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full mb-3">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-purple-300 font-semibold tracking-wide">POWERED BY GEMINI AI</span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Advanced AI Analysis</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                        Get deep, personalized insights into your trading psychology, mistakes, strengths and a 30-day improvement plan.
                    </p>

                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {[
                            { icon: '🚨', label: 'Biggest Mistakes' },
                            { icon: '💪', label: 'Your Strengths' },
                            { icon: '🧠', label: 'Psychology Score' },
                            { icon: '📅', label: '30-Day Plan' },
                            { icon: '🛡️', label: 'Risk Grade' },
                            { icon: '⏰', label: 'Best Times' },
                        ].map(tag => (
                            <span key={tag.label} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300 font-medium hover:border-purple-500/40 transition-colors">
                                <span>{tag.icon}</span>{tag.label}
                            </span>
                        ))}
                    </div>

                    <button onClick={fetchAll}
                        className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-100 transition-all duration-200">
                        <Brain className="w-5 h-5" />
                        Run Gemini AI Analysis
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loadStep >= 0) {
        return <LoadingPanel step={loadStep} />;
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <h4 className="font-bold text-red-300 mb-2">Analysis Failed</h4>
                <p className="text-red-400/80 mb-4 text-sm">{error}</p>
                <button onClick={fetchAll}
                    className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 font-semibold text-sm transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    if (!ruleData) return null;

    const r = ruleData;

    return (
        <div className="space-y-4">

            {/* ── Header Bar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl px-5 py-4 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/30">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-white">Advanced AI Analysis Complete</p>
                        <p className="text-xs text-slate-400">{tradesAnalyzed} trades analyzed • {new Date(r.analyzed_at).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <button onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/10 text-sm font-semibold transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Re-analyze
                </button>
            </div>

            {/* ── Quick Stats ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-wide">Trades Analyzed</p>
                    <p className="text-3xl font-black text-white">{r.rule_based_patterns.totalAnalyzed}</p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center justify-center">
                    <RingCard
                        score={r.discipline_score}
                        label="Discipline"
                        subtitle="Score /100"
                    />
                </div>

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wide">Recovery Rate</p>
                    <p className="text-3xl font-black text-white">{r.recovery_rate.toFixed(0)}%</p>
                    <p className="text-xs text-slate-500 mt-1">Wins after losses</p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs text-orange-400 font-semibold mb-1 uppercase tracking-wide">Max Loss Streak</p>
                    <p className="text-3xl font-black text-white">{r.rule_based_patterns.maxConsecutiveLosses}</p>
                    <p className="text-xs text-slate-500 mt-1">Consecutive losses</p>
                </div>
            </div>

            {/* ── Gemini AI Loading indicator ──────────────────────────────────── */}
            {aiLoading && (
                <div className="bg-gradient-to-r from-purple-950/50 to-pink-950/30 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/30">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    </div>
                    <div>
                        <p className="font-bold text-purple-200">Gemini AI is analyzing deeply…</p>
                        <p className="text-sm text-purple-400/70">Psychological &amp; behavioral pattern analysis in progress</p>
                    </div>
                    {/* shimmer */}
                    <div className="ml-auto h-6 w-24 rounded-xl bg-purple-500/10 overflow-hidden">
                        <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                    </div>
                </div>
            )}

            {aiError && (
                <div className="bg-orange-950/30 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-orange-300">Gemini AI unavailable</p>
                        <p className="text-sm text-orange-400/70">{aiError} — Rule-based analysis is shown below.</p>
                    </div>
                </div>
            )}

            {/* ═══════════════ GEMINI AI SECTIONS ════════════════════════════ */}
            {aiInsights && (
                <>
                    {/* Personalized Message */}
                    {aiInsights.personalized_message && (
                        <div className="bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-purple-900/60 rounded-2xl p-6 border border-purple-500/25">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/30 rounded-xl flex items-center justify-center shrink-0">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1 flex items-center gap-2">
                                        Gemini's Message For You
                                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">AI</span>
                                    </p>
                                    <p className="text-purple-100/80 leading-relaxed text-sm">{aiInsights.personalized_message}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Risk Management Grade */}
                    {aiInsights.risk_management_grade && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5">
                            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-black shrink-0 ${gradeColor(aiInsights.risk_management_grade)}`}>
                                {aiInsights.risk_management_grade}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                    <p className="font-bold text-white">Risk Management Grade</p>
                                </div>
                                {aiInsights.risk_management_issues && aiInsights.risk_management_issues.length > 0 && (
                                    <div className="space-y-1.5">
                                        {aiInsights.risk_management_issues.slice(0, 3).map((issue, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${issue.severity === 'Critical' ? 'bg-red-500/20 text-red-300' : issue.severity === 'High' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                    {issue.severity}
                                                </span>
                                                <span className="text-slate-300">{issue.issue} — <span className="text-emerald-400">{issue.fix}</span></span>
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
                            badge={`${aiInsights.biggest_mistakes.length} found`} accentColor="red">
                            <div className="space-y-3 mt-2">
                                {aiInsights.biggest_mistakes.map((m, i) => (
                                    <div key={i} className={`border-l-4 rounded-xl p-4 ${impactColor(m.impact)}`}>
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/10 rounded-full uppercase tracking-wide">{m.category}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${impactBadge(m.impact)}`}>{m.impact} Impact</span>
                                                </div>
                                                <h4 className="font-bold text-base text-white">{m.mistake}</h4>
                                            </div>
                                        </div>
                                        <p className="text-xs mb-1 opacity-70">📊 {m.frequency}</p>
                                        <p className="text-xs mb-3 opacity-70">⚠️ {m.why_harmful}</p>
                                        <div className="bg-black/20 border border-white/10 rounded-lg p-3 text-xs">
                                            <p className="font-semibold mb-1 text-emerald-400">✅ How To Fix:</p>
                                            <p className="text-slate-200">{m.how_to_fix}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Strengths */}
                    {aiInsights.strongest_areas && aiInsights.strongest_areas.length > 0 && (
                        <Section title="💪 Your Strengths" icon={TrendingUp} id="strengths" defaultOpen={true}
                            badge={`${aiInsights.strongest_areas.length} found`} accentColor="green">
                            <div className="grid md:grid-cols-2 gap-3 mt-2">
                                {aiInsights.strongest_areas.map((s, i) => (
                                    <div key={i} className="bg-emerald-950/40 border border-emerald-500/25 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <h4 className="font-bold text-emerald-300 text-sm">{s.strength}</h4>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">📊 {s.evidence}</p>
                                        <div className="text-xs bg-black/20 border border-emerald-500/20 rounded-lg p-2">
                                            <span className="font-semibold text-emerald-400">Leverage it: </span>
                                            <span className="text-slate-300">{s.how_to_leverage}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Psychological Analysis */}
                    {aiInsights.psychological_analysis && (
                        <Section title="🧠 Psychology & Mindset" icon={Brain} id="psychology" defaultOpen={true} accentColor="purple">
                            <div className="mt-2 space-y-4">
                                {/* Mental State Ring */}
                                <div className="flex items-center gap-5 bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
                                    <RingCard
                                        score={aiInsights.psychological_analysis.mental_state_score}
                                        max={10}
                                        label="Mental State"
                                        subtitle="Score /10"
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-white mb-0.5">Mental State Score</p>
                                        <p className="text-xs text-slate-400">Based on trading behavior patterns detected by Gemini AI</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {aiInsights.psychological_analysis.detected_patterns.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-slate-300 mb-2 flex items-center gap-2 text-sm">
                                                <Zap className="w-4 h-4 text-orange-400" /> Detected Patterns
                                            </p>
                                            <ul className="space-y-1.5">
                                                {aiInsights.psychological_analysis.detected_patterns.map((p, i) => (
                                                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                                        <span className="text-orange-400 mt-0.5 shrink-0">•</span>{p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {aiInsights.psychological_analysis.emotional_triggers.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-slate-300 mb-2 flex items-center gap-2 text-sm">
                                                <Heart className="w-4 h-4 text-red-400" /> Emotional Triggers
                                            </p>
                                            <ul className="space-y-1.5">
                                                {aiInsights.psychological_analysis.emotional_triggers.map((t, i) => (
                                                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                                        <span className="text-red-400 mt-0.5 shrink-0">•</span>{t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {aiInsights.psychological_analysis.recommendations.length > 0 && (
                                    <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-4">
                                        <p className="font-semibold text-blue-300 mb-2 flex items-center gap-2 text-sm">
                                            <Lightbulb className="w-4 h-4" /> Recommendations
                                        </p>
                                        <ul className="space-y-1.5">
                                            {aiInsights.psychological_analysis.recommendations.map((rec, i) => (
                                                <li key={i} className="text-sm text-blue-200/80 flex items-start gap-2">
                                                    <ArrowRight className="w-3 h-3 mt-1 shrink-0 text-blue-400" />{rec}
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
                        <Section title="📅 30-Day Improvement Plan" icon={Calendar} id="plan" defaultOpen={true} accentColor="blue">
                            <div className="mt-2 grid md:grid-cols-2 gap-3">
                                {aiInsights.next_30_days_plan.immediate_actions?.length > 0 && (
                                    <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                                        <p className="font-bold text-red-300 mb-3 flex items-center gap-2 text-sm">
                                            <Zap className="w-4 h-4" /> Immediate Actions
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.immediate_actions.map((a, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-red-200/80">
                                                    <span className="font-black text-red-400 shrink-0 w-4">{i + 1}.</span>{a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.weekly_goals?.length > 0 && (
                                    <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                                        <p className="font-bold text-blue-300 mb-3 flex items-center gap-2 text-sm">
                                            <Target className="w-4 h-4" /> Weekly Goals
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.weekly_goals.map((g, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-blue-200/80">
                                                    <Target className="w-3 h-3 mt-1 shrink-0 text-blue-400" />{g}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.habits_to_build?.length > 0 && (
                                    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                                        <p className="font-bold text-emerald-300 mb-3 flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4" /> Habits To Build
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.habits_to_build.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/80">
                                                    <span className="text-emerald-400 shrink-0 font-bold">+</span>{h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiInsights.next_30_days_plan.habits_to_break?.length > 0 && (
                                    <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-4">
                                        <p className="font-bold text-orange-300 mb-3 flex items-center gap-2 text-sm">
                                            <AlertTriangle className="w-4 h-4" /> Habits To Break
                                        </p>
                                        <ul className="space-y-2">
                                            {aiInsights.next_30_days_plan.habits_to_break.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-orange-200/80">
                                                    <span className="text-red-400 shrink-0 font-bold">−</span>{h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* Time-Based Insights */}
                    {aiInsights.time_based_insights && (
                        <Section title="⏰ Best Trading Times (AI)" icon={Clock} id="ai-time" accentColor="blue">
                            <div className="mt-2 grid md:grid-cols-2 gap-3">
                                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                                    <p className="font-semibold text-emerald-300 mb-2 text-sm">✅ Best Hours</p>
                                    <p className="text-2xl font-black text-emerald-400 font-mono">
                                        {aiInsights.time_based_insights.best_trading_hours.join('  ')}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Best Days: {aiInsights.time_based_insights.best_days.join(', ')}</p>
                                </div>
                                <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                                    <p className="font-semibold text-red-300 mb-2 text-sm">🚫 Avoid These</p>
                                    <p className="text-2xl font-black text-red-400 font-mono">
                                        {aiInsights.time_based_insights.worst_trading_hours.join('  ')}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Worst Days: {aiInsights.time_based_insights.worst_days.join(', ')}</p>
                                </div>
                                <div className="md:col-span-2 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                                    <p className="text-sm text-blue-200/80">{aiInsights.time_based_insights.recommendation}</p>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Setup Recommendations */}
                    {aiInsights.setup_recommendations && (
                        <Section title="🎯 Setup Recommendations (AI)" icon={Target} id="ai-setups" accentColor="amber">
                            <div className="mt-2 space-y-3">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                                        <p className="font-semibold text-red-300 mb-2 text-sm">🚫 Avoid These Setups</p>
                                        <ul className="space-y-1">
                                            {aiInsights.setup_recommendations.avoid_setups.map((s, i) => (
                                                <li key={i} className="text-sm text-red-200/80 flex items-center gap-2">
                                                    <span className="text-red-400 font-bold">✗</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                                        <p className="font-semibold text-emerald-300 mb-2 text-sm">✅ Focus On These</p>
                                        <ul className="space-y-1">
                                            {aiInsights.setup_recommendations.focus_on_setups.map((s, i) => (
                                                <li key={i} className="text-sm text-emerald-200/80 flex items-center gap-2">
                                                    <span className="text-emerald-400 font-bold">✓</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4">
                                    <p className="font-semibold text-purple-300 mb-1 flex items-center gap-2 text-sm">
                                        <BookOpen className="w-4 h-4" /> Improvement Plan
                                    </p>
                                    <p className="text-sm text-slate-300">{aiInsights.setup_recommendations.setup_improvement_plan}</p>
                                </div>
                            </div>
                        </Section>
                    )}
                </>
            )}

            {/* ═══════════════ RULE-BASED SECTIONS ═══════════════════════════ */}

            {/* Action Items */}
            <Section title="🎯 Action Items (Rule-Based)" icon={Target} id="recommendations" defaultOpen={!aiInsights}
                badge={`${r.recommendations.length} items`} accentColor="orange">
                <div className="space-y-3 mt-2">
                    {r.recommendations.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-emerald-400 font-medium">✅ No critical issues detected — Keep it up!</p>
                        </div>
                    ) : (
                        r.recommendations.map((rec, i) => (
                            <div key={i} className={`border-l-4 rounded-xl p-4 ${rec.priority === 'critical'
                                ? 'border-l-red-500 bg-red-950/30 text-red-100'
                                : rec.priority === 'high'
                                    ? 'border-l-orange-500 bg-orange-950/30 text-orange-100'
                                    : 'border-l-yellow-500 bg-yellow-950/20 text-yellow-100'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/10 rounded-full uppercase">{rec.priority}</span>
                                    <span className="text-xs opacity-60">{rec.category}</span>
                                </div>
                                <h4 className="font-bold text-white">{rec.action}</h4>
                                <p className="text-sm mt-1 opacity-70">{rec.reason}</p>
                                <div className="flex gap-2 text-xs mt-2">
                                    <span className="px-2 py-0.5 bg-white/10 rounded-full">Impact: {rec.impact}</span>
                                    <span className="px-2 py-0.5 bg-white/10 rounded-full">{rec.difficulty} to fix</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Section>

            {/* Setup Performance Table */}
            <Section title="📊 Setup Performance" icon={BarChart3} id="setups" accentColor="blue">
                <div className="mt-2 space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <h4 className="font-semibold text-emerald-300 text-sm">Best Setup</h4>
                            </div>
                            <p className="text-xl font-black text-white">{r.rule_based_patterns.bestSetup.name}</p>
                            <p className="text-xs text-emerald-400 mt-1">{r.rule_based_patterns.bestSetup.winRate.toFixed(1)}% win rate • ₹{r.rule_based_patterns.bestSetup.pnl.toFixed(0)}</p>
                        </div>
                        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="w-4 h-4 text-red-400" />
                                <h4 className="font-semibold text-red-300 text-sm">Worst Setup</h4>
                            </div>
                            <p className="text-xl font-black text-white">{r.rule_based_patterns.worstSetup.name}</p>
                            <p className="text-xs text-red-400 mt-1">{r.rule_based_patterns.worstSetup.winRate.toFixed(1)}% win rate • ₹{r.rule_based_patterns.worstSetup.pnl.toFixed(0)}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/80">
                                <tr>
                                    {['Setup', 'W', 'L', 'Win Rate', 'P&L'].map(h => (
                                        <th key={h} className="text-left py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(r.rule_based_patterns.setupPerformance).map(([setup, stats]: [string, any]) => {
                                    const total = stats.wins + stats.losses;
                                    const wr = total > 0 ? (stats.wins / total) * 100 : 0;
                                    return (
                                        <tr key={setup} className="border-t border-slate-700/40 hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4 font-medium text-white">{setup}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-bold">{stats.wins}</td>
                                            <td className="py-3 px-4 text-red-400 font-bold">{stats.losses}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${wr >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {wr.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <Section title="⏰ Time Patterns (Rule-Based)" icon={Clock} id="time" accentColor="blue">
                <div className="mt-2 grid md:grid-cols-2 gap-3">
                    <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 text-center">
                        <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-blue-300 mb-1">Best Trading Hour</p>
                        <p className="text-4xl font-black text-white font-mono">{String(r.rule_based_patterns.bestHour.hour).padStart(2, '0')}:00</p>
                        <p className="text-xs text-blue-400 mt-1">{r.rule_based_patterns.bestHour.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-4 text-center">
                        <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-orange-300 mb-1">Avoid This Hour</p>
                        <p className="text-4xl font-black text-white font-mono">{String(r.worst_hour.hour).padStart(2, '0')}:00</p>
                        <p className="text-xs text-orange-400 mt-1">{r.worst_hour.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 text-center">
                        <Calendar className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-emerald-300 mb-1">Best Day</p>
                        <p className="text-3xl font-black text-white">{r.day_analysis.bestDay.day}</p>
                        <p className="text-xs text-emerald-400 mt-1">{r.day_analysis.bestDay.winRate.toFixed(1)}% win rate</p>
                    </div>
                    <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 text-center">
                        <Calendar className="w-5 h-5 text-red-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-red-300 mb-1">Worst Day</p>
                        <p className="text-3xl font-black text-white">{r.day_analysis.worstDay.day}</p>
                        <p className="text-xs text-red-400 mt-1">{r.day_analysis.worstDay.winRate.toFixed(1)}% win rate</p>
                    </div>
                </div>
            </Section>

            {/* Behavioral Insights */}
            <Section title="🧠 Behavioral Insights" icon={Brain} id="behavioral" accentColor="purple">
                <div className="mt-2 space-y-3">
                    {r.revenge_trades.length > 0 ? (
                        <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                <h4 className="font-semibold text-yellow-300">Revenge Trading Detected</h4>
                                <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-300 px-2.5 py-0.5 rounded-full font-bold border border-yellow-500/30">
                                    {r.revenge_trades.length} cases
                                </span>
                            </div>
                            <p className="text-sm text-yellow-200/70 mb-3">
                                {r.revenge_trades.length} trades entered within 30 min of a loss — classic revenge trading.
                            </p>
                            <div className="grid md:grid-cols-3 gap-2">
                                {r.revenge_trades.slice(0, 3).map((trade, i) => (
                                    <div key={i} className="bg-black/20 border border-yellow-500/10 rounded-lg p-3 text-sm">
                                        <p className="font-semibold text-white">{trade.symbol}</p>
                                        <p className="text-xs text-slate-400">{trade.minutesAfter} min after ₹{Math.abs(trade.afterLoss || 0).toFixed(0)} loss</p>
                                        <p className={`font-bold ${trade.result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ₹{trade.result.toFixed(0)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-6 text-center">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <p className="text-emerald-300 font-bold text-lg">✅ No Revenge Trading Detected</p>
                            <p className="text-emerald-500/70 text-sm">Excellent emotional discipline!</p>
                        </div>
                    )}
                </div>
            </Section>

            {/* Footer */}
            <div className="text-center text-xs text-slate-600 py-2">
                Analysis by Gemini AI + Rule Engine • {tradesAnalyzed} trades • {new Date(r.analyzed_at).toLocaleString('en-IN')}
            </div>
        </div>
    );
}
