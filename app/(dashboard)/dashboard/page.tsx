'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import AdvancedAnalysisResults from '@/components/analysis/AdvancedAnalysisResults';
import PsychologyTracker from '@/components/psychology/psychology-tracker';
import { 
  Activity, DollarSign, Target, BarChart3, Calendar, Zap, Brain, Sparkles, 
  AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { stats, loading, error } = useDashboardStats();
  
  // Advanced AI Analysis states
  const [advancedAnalysis, setAdvancedAnalysis] = useState<any>(null);
  const [analyzingAdvanced, setAnalyzingAdvanced] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Pattern Analysis states
  const [patternAnalysis, setPatternAnalysis] = useState<any>(null);
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  
  // Psychology Tracker state
  const [showPsychology, setShowPsychology] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Advanced AI Analysis Function
  const runAdvancedAnalysis = async () => {
    console.log('🔥 Starting Advanced AI Analysis...');
    
    setAnalyzingAdvanced(true);
    setAnalysisError(null);
    
    try {
      const response = await fetch('/api/analysis/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Advanced analysis received:', data);

      if (data.success && data.analysis) {
        setAdvancedAnalysis(data.analysis);
      } else {
        setAnalysisError(data.message || 'No analysis received');
      }
    } catch (err: any) {
      console.error('❌ Advanced analysis error:', err);
      setAnalysisError(err.message);
    } finally {
      setAnalyzingAdvanced(false);
    }
  };

  // Pattern Analysis Function
  const analyzePatterns = async () => {
    setAnalyzingPatterns(true);
    try {
      const response = await fetch('/api/analyze-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, days: 30 })
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setPatternAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Pattern analysis error:', err);
    } finally {
      setAnalyzingPatterns(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-white border-b px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            📊 Trading Journal
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! {totalTrades} trades tracked • Win Rate: {winRate.toFixed(1)}%
          </p>
        </div>

        {/* ADVANCED AI ANALYSIS BANNER */}
        {totalTrades >= 5 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-xl shadow-2xl p-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Sparkles className="w-12 h-12 text-white animate-pulse" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-1">🔥 Advanced AI Analysis Ready!</h3>
                    <p className="text-purple-100 mb-2">
                      Discover exactly where you make mistakes & when to trade
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-white/20 px-2 py-1 rounded">⏰ Time-based patterns</span>
                      <span className="bg-white/20 px-2 py-1 rounded">🎯 Setup analysis</span>
                      <span className="bg-white/20 px-2 py-1 rounded">🧠 Psychology insights</span>
                      <span className="bg-white/20 px-2 py-1 rounded">📈 30-day plan</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={runAdvancedAnalysis}
                  disabled={analyzingAdvanced}
                  className="px-8 py-4 bg-white text-purple-600 rounded-xl hover:bg-purple-50 font-bold disabled:opacity-50 flex items-center gap-3 shadow-lg transition-all transform hover:scale-105"
                >
                  <Brain className="w-6 h-6" />
                  <span>
                    {analyzingAdvanced ? (
                      <>
                        <span className="animate-pulse">Analyzing...</span>
                        <div className="text-xs text-purple-400">This may take 10-15 seconds</div>
                      </>
                    ) : (
                      <>
                        <span>Get Advanced Analysis</span>
                        <div className="text-xs text-purple-400">{totalTrades} trades ready</div>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MINIMUM TRADES WARNING */}
        {totalTrades < 5 && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900">Need More Trades for AI Analysis</h4>
                <p className="text-sm text-yellow-700">
                  You have {totalTrades} trades. Need at least 5 trades for advanced AI analysis.
                  Add {5 - totalTrades} more trade{5 - totalTrades > 1 ? 's' : ''} to unlock advanced insights!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {analysisError && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900">Analysis Failed</h4>
                <p className="text-sm text-red-700">{analysisError}</p>
                <button
                  onClick={runAdvancedAnalysis}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PATTERN ANALYSIS RESULTS */}
        {patternAnalysis && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                AI Pattern Analysis
              </h3>
              <button
                onClick={() => setPatternAnalysis(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Biggest Strength */}
              {patternAnalysis.ai_insights?.biggest_strength && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Biggest Strength
                  </h4>
                  <p className="text-sm text-green-800 font-medium mb-1">
                    {patternAnalysis.ai_insights.biggest_strength.area}
                  </p>
                  <p className="text-xs text-green-700">
                    {patternAnalysis.ai_insights.biggest_strength.description}
                  </p>
                </div>
              )}

              {/* Biggest Weakness */}
              {patternAnalysis.ai_insights?.biggest_weakness && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Area to Improve
                  </h4>
                  <p className="text-sm text-red-800 font-medium mb-1">
                    {patternAnalysis.ai_insights.biggest_weakness.area}
                  </p>
                  <p className="text-xs text-red-700">
                    {patternAnalysis.ai_insights.biggest_weakness.description}
                  </p>
                </div>
              )}
            </div>

            {/* Next Week Focus */}
            {patternAnalysis.ai_insights?.next_week_focus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🎯 Focus Areas for Next Week</h4>
                <ul className="space-y-1">
                  {patternAnalysis.ai_insights.next_week_focus.map((focus: string, i: number) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span>•</span>
                      <span>{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            icon={<Activity className="w-6 h-6" />} 
            title="Total Trades" 
            value={totalTrades} 
            subtitle={`${openTrades} open`} 
            color="blue" 
          />
          <StatsCard 
            icon={<Target className="w-6 h-6" />} 
            title="Win Rate" 
            value={`${winRate.toFixed(1)}%`} 
            subtitle={winRate >= 50 ? 'Above average' : 'Below 50%'} 
            color={winRate >= 50 ? 'green' : 'red'} 
          />
          <StatsCard 
            icon={<DollarSign className="w-6 h-6" />} 
            title="Total P&L" 
            value={`₹${totalPnL.toFixed(2)}`} 
            subtitle={totalPnL >= 0 ? 'Profitable' : 'In loss'} 
            color={totalPnL >= 0 ? 'green' : 'red'} 
          />
          <StatsCard 
            icon={<BarChart3 className="w-6 h-6" />} 
            title="Risk:Reward" 
            value={`1:${riskRewardRatio.toFixed(2)}`} 
            subtitle={riskRewardRatio >= 2 ? 'Good' : 'Improve'} 
            color={riskRewardRatio >= 2 ? 'green' : 'orange'} 
          />
        </div>

        {/* SECONDARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">This Week</h3>
            </div>
            <p className={`text-3xl font-bold ${weeklyPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₹{weeklyPnL.toFixed(2)}
            </p>
            <p className="text-xs text-blue-700 mt-1">Last 7 days</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-medium text-purple-900">This Month</h3>
            </div>
            <p className={`text-3xl font-bold ${monthlyPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₹{monthlyPnL.toFixed(2)}
            </p>
            <p className="text-xs text-purple-700 mt-1">Last 30 days</p>
          </div>

          <div className={`bg-gradient-to-br ${
            currentStreak.type === 'win' ? 'from-green-50 to-green-100 border-green-200' :
            currentStreak.type === 'loss' ? 'from-red-50 to-red-100 border-red-200' :
            'from-gray-50 to-gray-100 border-gray-200'
          } rounded-lg shadow p-6 border`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`w-5 h-5 ${
                currentStreak.type === 'win' ? 'text-green-600' :
                currentStreak.type === 'loss' ? 'text-red-600' :
                'text-gray-600'
              }`} />
              <h3 className={`text-sm font-medium ${
                currentStreak.type === 'win' ? 'text-green-900' :
                currentStreak.type === 'loss' ? 'text-red-900' :
                'text-gray-900'
              }`}>
                Current Streak
              </h3>
            </div>
            <p className={`text-3xl font-bold ${
              currentStreak.type === 'win' ? 'text-green-700' :
              currentStreak.type === 'loss' ? 'text-red-700' :
              'text-gray-700'
            }`}>
              {currentStreak.count > 0 ? currentStreak.count : '-'}
            </p>
            <p className={`text-xs mt-1 ${
              currentStreak.type === 'win' ? 'text-green-700' :
              currentStreak.type === 'loss' ? 'text-red-700' :
              'text-gray-700'
            }`}>
              {currentStreak.type === 'win' ? 'Winning streak 🔥' :
               currentStreak.type === 'loss' ? 'Losing streak' :
               'No active streak'}
            </p>
          </div>
        </div>

        {/* PSYCHOLOGY TRACKER SECTION */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-4">
            <button
              onClick={() => setShowPsychology(!showPsychology)}
              className="w-full flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="text-lg font-bold">Trading Psychology Tracker</h3>
                  <p className="text-purple-100 text-sm">Track your mental state before trading</p>
                </div>
              </div>
              <span className="text-2xl">{showPsychology ? '▼' : '▶'}</span>
            </button>
          </div>

          {showPsychology && (
            <div className="mt-4">
              <PsychologyTracker />
            </div>
          )}
        </div>

        {/* PERFORMANCE BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Win</span>
                <span className="text-lg font-bold text-green-600">₹{avgWin.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Loss</span>
                <span className="text-lg font-bold text-red-600">₹{avgLoss.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-gray-600">Best Trade</span>
                <span className="text-lg font-bold text-green-600">₹{bestTrade.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Worst Trade</span>
                <span className="text-lg font-bold text-red-600">₹{worstTrade.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
            {recentTrades.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trades yet</p>
            ) : (
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div 
                    key={trade.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{trade.symbol}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(trade.entry_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        trade.pnl && trade.pnl > 0 ? 'text-green-600' : 
                        trade.pnl && trade.pnl < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {trade.pnl ? `₹${trade.pnl.toFixed(2)}` : 'Open'}
                      </p>
                      <p className="text-xs text-gray-500">{trade.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/trades/new" className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium text-center transition">
              ➕ Add Trade
            </Link>
            <Link href="/trades" className="w-full bg-gray-200 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium text-center transition">
              📊 View All
            </Link>
            <button
              onClick={analyzePatterns}
              disabled={analyzingPatterns || totalTrades < 5}
              className="w-full bg-purple-200 text-purple-900 px-4 py-3 rounded-lg hover:bg-purple-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              {analyzingPatterns ? 'Analyzing...' : 'AI Insights'}
            </button>
            <Link href="/import" className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium text-center transition">
              📤 Import
            </Link>
            <Link href="/psychology" className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 font-medium text-center transition">
              🧠 Psychology
            </Link>
          </div>
        </div>
      </div>

      {/* ADVANCED ANALYSIS RESULTS MODAL */}
      {advancedAnalysis && (
        <AdvancedAnalysisResults
          analysis={advancedAnalysis}
          onClose={() => setAdvancedAnalysis(null)}
        />
      )}
    </div>
  );
}

function StatsCard({ icon, title, value, subtitle, color }: any) {
  const colors: any = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600',
    red: 'from-red-50 to-red-100 border-red-200 text-red-600',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg shadow p-6 border`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={colors[color].split(' ')[2]}>{icon}</div>
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
    </div>
  );
}