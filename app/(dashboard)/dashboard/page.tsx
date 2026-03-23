'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import AdvancedAnalysisResults from '@/components/analysis/AdvancedAnalysisResults';
import AdvancedAnalysisPanel from '@/components/dashboard/AdvancedAnalysisPanel';
import PsychologyTracker from '@/components/psychology/psychology-tracker';
import {
  Activity, DollarSign, Target, BarChart3, Calendar, Zap, Brain, Sparkles,
  AlertCircle, TrendingUp, TrendingDown, LogOut, Globe, Plus, Eye, Upload,
  ChevronDown, ChevronUp
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { stats, loading, error } = useDashboardStats();

  const [advancedAnalysis, setAdvancedAnalysis] = useState<any>(null);
  const [analyzingAdvanced, setAnalyzingAdvanced] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<any>(null);
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const runAdvancedAnalysis = async () => {
    setAnalyzingAdvanced(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/analysis/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.analysis) {
        setAdvancedAnalysis(data.analysis);
      } else {
        setAnalysisError(data.message || 'No analysis received');
      }
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzingAdvanced(false);
    }
  };

  const analyzePatterns = async () => {
    setAnalyzingPatterns(true);
    try {
      const response = await fetch('/api/ai/analyze-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, days: 30 })
      });
      const data = await response.json();
      if (data.success && data.analysis) setPatternAnalysis(data.analysis);
    } catch (err) {
      console.error('Pattern analysis error:', err);
    } finally {
      setAnalyzingPatterns(false);
    }
  };

  // ── Loading Screen ──────────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-up">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 max-w-md animate-scale-in">
          <h3 className="text-red-300 font-semibold mb-2">Error</h3>
          <p className="text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  const {
    totalTrades, winRate, totalPnL, weeklyPnL, monthlyPnL,
    avgWin, avgLoss, bestTrade, worstTrade, currentStreak,
    riskRewardRatio, recentTrades, openTrades
  } = stats;

  return (
    <div className="min-h-screen">

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav className="px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link href="/dashboard"
            className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-gradient">Trading Journal</span>
          </Link>

          {/* Nav actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/market-outlook"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold
                         bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white
                         rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all
                         shadow-sm hover:shadow-md hover:shadow-purple-500/25
                         border border-purple-500/30 backdrop-blur-sm">
              <Globe className="w-3.5 h-3.5" />
              Market Outlook
            </Link>

            <span className="text-sm text-slate-400 hidden sm:block px-1">
              {session.user?.name || session.user?.email}
            </span>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30
                         text-red-400 rounded-lg hover:bg-red-500/20 text-sm font-semibold
                         transition-all hover:border-red-500/50">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── PAGE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div className="animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight theme-text-primary">Dashboard</h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {totalTrades} trades tracked
                <span className="text-slate-600">•</span>
                Win Rate:
                <span className={`font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {winRate.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── AI ANALYSIS BANNER ───────────────────────────────────────────────── */}
        {totalTrades >= 5 && (
          <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30
                            bg-gradient-to-r from-purple-950/70 via-pink-950/50 to-purple-950/70
                            shadow-2xl shadow-purple-500/20">
              {/* Glow orbs */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl" />
              </div>

              <div className="relative flex items-center justify-between flex-wrap gap-4 p-6 md:p-8">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-md animate-pulse" />
                    <div className="relative w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black">🔥 Advanced AI Analysis Ready!</h3>
                    </div>
                    <p className="text-purple-200/80 text-sm mb-3">
                      Discover patterns, mistakes, strengths & get actionable recommendations
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {['⏰ Time patterns', '🎯 Setup analysis', '🧠 Behavioral insights', '📊 Action items'].map(t => (
                        <span key={t} className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
                  className="group relative flex items-center gap-3 px-6 py-3.5 bg-white text-purple-700
                             rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-purple-500/30
                             hover:scale-105 active:scale-100 transition-all duration-200">
                  <Brain className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>
                    {showAdvancedPanel ? 'Hide Analysis' : 'Show Advanced Analysis'}
                    <span className="block text-xs text-purple-400 font-medium">
                      {showAdvancedPanel ? 'Click to close' : `${totalTrades} trades ready`}
                    </span>
                  </span>
                  {showAdvancedPanel
                    ? <ChevronUp className="w-4 h-4 text-purple-400" />
                    : <ChevronDown className="w-4 h-4 text-purple-400" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── NOT ENOUGH TRADES ─────────────────────────────────────────────── */}
        {totalTrades < 5 && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-5
                          animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-amber-300 mb-0.5">Need More Trades for AI Analysis</h4>
                <p className="text-sm text-amber-400/70">
                  You have <strong>{totalTrades}</strong> trades. Need at least 5 for advanced AI analysis.
                  Add <strong>{5 - totalTrades}</strong> more trade{5 - totalTrades > 1 ? 's' : ''} to unlock!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR MESSAGE ──────────────────────────────────────────────────── */}
        {analysisError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 animate-scale-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-300 mb-0.5">Analysis Failed</h4>
                <p className="text-sm text-red-400/70 mb-2">{analysisError}</p>
                <button onClick={runAdvancedAnalysis}
                  className="text-sm text-red-400 underline hover:text-red-300 transition-colors">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADVANCED AI PANEL ─────────────────────────────────────────────── */}
        {showAdvancedPanel && (
          <div className="animate-fade-up">
            <AdvancedAnalysisPanel />
          </div>
        )}

        {/* ── PATTERN ANALYSIS RESULTS ──────────────────────────────────────── */}
        {patternAnalysis && (
          <div className="border border-purple-500/25 rounded-2xl p-6 animate-scale-in theme-card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2 theme-text-primary">
                <Brain className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                AI Pattern Analysis
              </h3>
              <button
                onClick={() => setPatternAnalysis(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200/50 dark:bg-slate-700/60
                           text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-slate-700 text-xl leading-none
                           transition-all font-bold border border-slate-300/40 dark:border-slate-600/50">
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {patternAnalysis.ai_insights?.biggest_strength && (
                <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4" /> Biggest Strength
                  </h4>
                  <p className="text-sm text-emerald-200 font-medium mb-1">
                    {patternAnalysis.ai_insights.biggest_strength.area}
                  </p>
                  <p className="text-xs text-emerald-400/70">
                    {patternAnalysis.ai_insights.biggest_strength.description}
                  </p>
                </div>
              )}
              {patternAnalysis.ai_insights?.biggest_weakness && (
                <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-red-300 mb-2 flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4" /> Area to Improve
                  </h4>
                  <p className="text-sm text-red-200 font-medium mb-1">
                    {patternAnalysis.ai_insights.biggest_weakness.area}
                  </p>
                  <p className="text-xs text-red-400/70">
                    {patternAnalysis.ai_insights.biggest_weakness.description}
                  </p>
                </div>
              )}
            </div>

            {patternAnalysis.ai_insights?.next_week_focus && (
              <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-4">
                <h4 className="font-semibold text-blue-300 mb-2 text-sm">🎯 Focus Areas for Next Week</h4>
                <ul className="space-y-1.5">
                  {patternAnalysis.ai_insights.next_week_focus.map((focus: string, i: number) => (
                    <li key={i} className="text-sm text-blue-200/80 flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── STATS GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <StatsCard
            icon={<Activity className="w-5 h-5" />}
            title="Total Trades"
            value={totalTrades}
            subtitle={`${openTrades} open positions`}
            color="blue"
          />
          <StatsCard
            icon={<Target className="w-5 h-5" />}
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            subtitle={winRate >= 50 ? '↑ Above average' : '↓ Below 50%'}
            color={winRate >= 50 ? 'green' : 'red'}
          />
          <StatsCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Total P&L"
            value={`₹${totalPnL.toFixed(2)}`}
            subtitle={totalPnL >= 0 ? '↑ Profitable overall' : '↓ In loss overall'}
            color={totalPnL >= 0 ? 'green' : 'red'}
          />
          <StatsCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Risk:Reward"
            value={`1:${riskRewardRatio.toFixed(2)}`}
            subtitle={riskRewardRatio >= 2 ? '✓ Good ratio' : 'Needs improvement'}
            color={riskRewardRatio >= 2 ? 'green' : 'orange'}
          />
        </div>

        {/* ── SECONDARY STATS ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
          {/* Weekly */}
          <div className="relative overflow-hidden border border-blue-500/20 rounded-2xl p-6
                          hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 group backdrop-blur-xl theme-card">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent rounded-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-300">This Week</h3>
              </div>
              <p className={`text-3xl font-black ${weeklyPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                ₹{weeklyPnL.toFixed(2)}
              </p>
              <p className="text-xs mt-1 theme-text-muted">Last 7 days</p>
            </div>
          </div>

          {/* Monthly */}
          <div className="relative overflow-hidden border border-purple-500/20 rounded-2xl p-6
                          hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 group backdrop-blur-xl theme-card">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent rounded-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-300">This Month</h3>
              </div>
              <p className={`text-3xl font-black ${monthlyPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                ₹{monthlyPnL.toFixed(2)}
              </p>
              <p className="text-xs mt-1 theme-text-muted">Last 30 days</p>
            </div>
          </div>

          {/* Streak */}
          <div className={`relative overflow-hidden rounded-2xl p-6 border backdrop-blur-xl theme-card
                          hover:-translate-y-1 transition-all duration-300
                          ${currentStreak.type === 'win' ? 'border-emerald-500/25 hover:border-emerald-500/50' :
              currentStreak.type === 'loss' ? 'border-red-500/25 hover:border-red-500/50' :
                'border-[var(--border)]'}`}>
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br
              ${currentStreak.type === 'win' ? 'from-emerald-600/5 to-transparent' :
                currentStreak.type === 'loss' ? 'from-red-600/5 to-transparent' :
                  'from-slate-700/20 to-transparent'}`} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border
                  ${currentStreak.type === 'win' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    currentStreak.type === 'loss' ? 'bg-red-500/10 border-red-500/20' :
                      'bg-slate-700/50 border-slate-600/30'}`}>
                  <Zap className={`w-4 h-4
                    ${currentStreak.type === 'win' ? 'text-emerald-400' :
                      currentStreak.type === 'loss' ? 'text-red-400' : 'text-slate-500'}`} />
                </div>
                <h3 className={`text-sm font-semibold
                  ${currentStreak.type === 'win' ? 'text-emerald-300' :
                    currentStreak.type === 'loss' ? 'text-red-300' : 'text-slate-400'}`}>
                  Current Streak
                </h3>
              </div>
              <p className={`text-3xl font-black
                ${currentStreak.type === 'win' ? 'text-emerald-400' :
                  currentStreak.type === 'loss' ? 'text-red-400' : 'text-slate-500'}`}>
                {currentStreak.count > 0 ? currentStreak.count : '—'}
              </p>
              <p className={`text-xs mt-1
                ${currentStreak.type === 'win' ? 'text-emerald-500' :
                  currentStreak.type === 'loss' ? 'text-red-500' : 'text-slate-600'}`}>
                {currentStreak.type === 'win' ? '🔥 Winning streak' :
                  currentStreak.type === 'loss' ? 'Losing streak' : 'No active streak'}
              </p>
            </div>
          </div>
        </div>

        {/* ── PSYCHOLOGY TRACKER ───────────────────────────────────────────── */}
        <div className="animate-fade-up">
          <div className="rounded-2xl overflow-hidden border border-purple-500/25
                          bg-gradient-to-r from-purple-950/60 to-pink-950/40
                          shadow-lg shadow-purple-500/10">
            <button
              onClick={() => setShowPsychology(!showPsychology)}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/15 border border-purple-500/30 rounded-xl
                                flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white">Trading Psychology Tracker</h3>
                  <p className="text-purple-300/60 text-xs">Track your mental state before trading</p>
                </div>
              </div>
              <div className="text-slate-500">
                {showPsychology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showPsychology && (
              <div className="border-t border-purple-500/20 p-5 animate-fade-up">
                <PsychologyTracker />
              </div>
            )}
          </div>
        </div>

        {/* ── PERFORMANCE BREAKDOWN + RECENT TRADES ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Win/Loss Breakdown */}
          <div className="rounded-2xl p-6 border backdrop-blur-xl transition-all duration-300 animate-fade-up theme-card">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 theme-text-primary">
              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              </div>
              Win/Loss Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Average Win', value: avgWin, good: true },
                { label: 'Average Loss', value: avgLoss, good: false },
              ].map(row => (
                <div key={row.label}
                  className="flex items-center justify-between p-3 border rounded-xl theme-surface">
                  <span className="text-sm font-medium theme-text-muted">{row.label}</span>
                  <span className={`text-lg font-black ${row.good ? 'text-emerald-500' : 'text-red-500'}`}>
                    ₹{row.value.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-700/40 pt-3 space-y-3">
                {[
                  { label: 'Best Trade', value: bestTrade, good: true },
                  { label: 'Worst Trade', value: worstTrade, good: false },
                ].map(row => (
                  <div key={row.label}
                    className="flex items-center justify-between p-3 border rounded-xl theme-surface">
                    <span className="text-sm font-medium theme-text-muted">{row.label}</span>
                    <span className={`text-lg font-black ${row.good ? 'text-emerald-500' : 'text-red-500'}`}>
                      ₹{row.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="rounded-2xl p-6 border transition-all duration-300 animate-fade-up backdrop-blur-xl theme-card">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 theme-text-primary">
              <div className="w-7 h-7 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              </div>
              Recent Trades
            </h3>
            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No trades yet — add your first trade!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrades.map((trade) => (
                  <div key={trade.id}
                    className="flex items-center justify-between p-3 border rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 theme-surface">
                    <div>
                      <p className="font-bold text-sm theme-text-primary">{trade.symbol}</p>
                      <p className="text-xs theme-text-muted">
                        {new Date(trade.entry_time).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${trade.pnl && trade.pnl > 0 ? 'text-emerald-500' :
                        trade.pnl && trade.pnl < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        {trade.pnl ? `₹${trade.pnl.toFixed(2)}` : 'Open'}
                      </p>
                      <p className="text-xs capitalize theme-text-muted">{trade.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 border backdrop-blur-xl transition-all duration-300 animate-fade-up theme-card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 theme-text-primary">
            <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/trades/new"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-blue-600 to-blue-700 text-white
                         hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/20
                         hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
              <Plus className="w-4 h-4" /> Add Trade
            </Link>

            <Link href="/trades"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm
                         bg-slate-700/70 border border-slate-600/50 text-slate-200
                         hover:bg-slate-700 hover:border-slate-500/60 hover:-translate-y-0.5 active:translate-y-0
                         transition-all duration-200">
              <Eye className="w-4 h-4" /> View All
            </Link>

            <Link href="/import"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-emerald-600 to-emerald-700 text-white
                         hover:from-emerald-500 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20
                         hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
              <Upload className="w-4 h-4" /> Import
            </Link>
          </div>
        </div>

      </div>

      {/* ── ADVANCED ANALYSIS RESULTS MODAL ──────────────────────────────── */}
      {advancedAnalysis && (
        <AdvancedAnalysisResults
          analysis={advancedAnalysis}
          onClose={() => setAdvancedAnalysis(null)}
        />
      )}
    </div>
  );
}

// ── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({ icon, title, value, subtitle, color }: any) {
  const accentMap: any = {
    blue:   { icon: 'text-blue-400', border: 'border-blue-500/25', iconBg: 'bg-blue-500/10', card: 'hover:border-blue-500/40' },
    green:  { icon: 'text-emerald-400', border: 'border-emerald-500/25', iconBg: 'bg-emerald-500/10', card: 'hover:border-emerald-500/40' },
    red:    { icon: 'text-red-400', border: 'border-red-500/25', iconBg: 'bg-red-500/10', card: 'hover:border-red-500/40' },
    orange: { icon: 'text-amber-400', border: 'border-amber-500/25', iconBg: 'bg-amber-500/10', card: 'hover:border-amber-500/40' },
  };
  const a = accentMap[color] || accentMap.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border backdrop-blur-xl theme-card
                   hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group ${a.card}`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      bg-gradient-to-br from-white/3 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${a.iconBg} ${a.border} ${a.icon}`}>
            {icon}
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wide theme-text-muted">{title}</h3>
        </div>
        <p className="text-2xl font-black mb-0.5 theme-text-primary">{value}</p>
        <p className="text-xs theme-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}