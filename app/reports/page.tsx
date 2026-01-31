// File: app/reports/page.tsx
// ✅ AI-Powered Weekly Report Dashboard

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Sparkles
} from 'lucide-react';

interface WeeklyStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  openTrades: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  bestSetup: string;
  worstSetup: string;
  profitFactor: number;
  avgRiskReward: number;
}

interface WeeklyReport {
  success: boolean;
  period: {
    start: string;
    end: string;
  };
  stats: WeeklyStats | null;
  mistakes: string[];
  aiInsights: string;
  recommendations: string[];
  totalTrades: number;
}

export default function WeeklyReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'last'>('current');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      generateReport();
    }
  }, [session, selectedWeek]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/weekly?week=${selectedWeek}`);
      const data = await response.json();

      if (response.ok) {
        setReport(data);
      } else {
        alert('Failed to generate report: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const reportText = `
WEEKLY TRADING REPORT
=====================
Period: ${report.period.start} to ${report.period.end}

PERFORMANCE SUMMARY
-------------------
Total Trades: ${report.stats?.totalTrades || 0}
Win Rate: ${report.stats?.winRate.toFixed(1) || 0}%
Total P&L: $${report.stats?.totalPnL.toFixed(2) || 0}
Profit Factor: ${report.stats?.profitFactor.toFixed(2) || 0}

STATISTICS
----------
Winning Trades: ${report.stats?.winningTrades || 0}
Losing Trades: ${report.stats?.losingTrades || 0}
Average Win: $${report.stats?.avgWin.toFixed(2) || 0}
Average Loss: $${report.stats?.avgLoss.toFixed(2) || 0}
Largest Win: $${report.stats?.largestWin.toFixed(2) || 0}
Largest Loss: $${report.stats?.largestLoss.toFixed(2) || 0}
Best Setup: ${report.stats?.bestSetup || 'N/A'}
Worst Setup: ${report.stats?.worstSetup || 'N/A'}

MISTAKES DETECTED
-----------------
${report.mistakes.length > 0 ? report.mistakes.map((m, i) => `${i + 1}. ${m}`).join('\n') : 'None detected'}

AI INSIGHTS
-----------
${report.aiInsights}

RECOMMENDATIONS
---------------
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generated on: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${report.period.start}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating AI report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            📊 Trading Journal
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                Dashboard
              </button>
            </Link>
            <Link href="/trades">
              <button className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                Trades
              </button>
            </Link>
            <span className="text-sm text-gray-600">
              {session?.user?.name || session?.user?.email}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-yellow-500" />
                AI Weekly Report
              </h1>
              <p className="text-gray-600 mt-1">AI-powered trading performance analysis</p>
            </div>
            {report && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            )}
          </div>

          {/* Week Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedWeek('current')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedWeek === 'current'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📅 Current Week
            </button>
            <button
              onClick={() => setSelectedWeek('last')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedWeek === 'last'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📆 Last Week
            </button>
          </div>
        </div>

        {report && report.stats && (
          <>
            {/* Period Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Report Period</span>
              </div>
              <p className="text-lg font-bold text-blue-700">
                {new Date(report.period.start).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
                {' → '}
                {new Date(report.period.end).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Total Trades</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{report.stats.totalTrades}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.stats.winningTrades}W · {report.stats.losingTrades}L · {report.stats.openTrades} Open
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Total P&L</span>
                </div>
                <p className={`text-3xl font-bold ${
                  report.stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {report.stats.totalPnL >= 0 ? '+' : ''}${report.stats.totalPnL.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Best: ${report.stats.largestWin.toFixed(2)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Win Rate</span>
                </div>
                <p className={`text-3xl font-bold ${
                  report.stats.winRate >= 50 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {report.stats.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.stats.winRate >= 50 ? '✅ Above 50%' : '⚠️ Below 50%'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-gray-600">Profit Factor</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {report.stats.profitFactor.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.stats.profitFactor >= 1.5 ? '✅ Good' : '⚠️ Improve'}
                </p>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Win</span>
                    <span className="font-bold text-green-600">
                      ${report.stats.avgWin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Loss</span>
                    <span className="font-bold text-red-600">
                      ${report.stats.avgLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Largest Win</span>
                    <span className="font-bold text-green-600">
                      ${report.stats.largestWin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Largest Loss</span>
                    <span className="font-bold text-red-600">
                      ${report.stats.largestLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">Avg R:R Ratio</span>
                    <span className={`font-bold ${
                      report.stats.avgRiskReward >= 1.5 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      1:{report.stats.avgRiskReward.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Setup Analysis</h3>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Best Performing Setup</p>
                    <p className="text-xl font-bold text-green-700">
                      {report.stats.bestSetup === 'unknown' ? 'N/A' : report.stats.bestSetup.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Focus on this setup type
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Worst Performing Setup</p>
                    <p className="text-xl font-bold text-red-700">
                      {report.stats.worstSetup === 'unknown' ? 'N/A' : report.stats.worstSetup.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Avoid or refine this setup
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mistakes Section */}
            {report.mistakes.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-red-900">⚠️ Mistakes Detected</h3>
                </div>
                <ul className="space-y-2">
                  {report.mistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span className="text-red-800">{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-bold text-purple-900">🤖 AI-Powered Insights</h3>
              </div>
              <div className="prose max-w-none">
                <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                  {report.aiInsights}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-green-900">✅ Action Plan for Next Week</h3>
              </div>
              <ul className="space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-green-800 font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {report && !report.stats && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trading Activity</h3>
            <p className="text-gray-600 mb-6">
              {report.aiInsights || 'No trades found for this week'}
            </p>
            <Link href="/trades/new">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
                + Add Trade
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}