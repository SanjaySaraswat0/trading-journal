'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TradeDetailModal from '@/components/trades/trade-detail-modal';
import TradeChartModal from '@/components/trades/trade-chart-modal';
import ThemeToggle from '@/components/ui/theme-toggle';
import {
  Search,
  ArrowUpDown,
  Filter,
  BarChart3,
  TrendingUp,
  Lock,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  asset_type: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  position_size: number;
  pnl?: number;
  pnl_percentage?: number;
  status: string;
  entry_time: string;
  exit_time?: string;
  setup_type?: string;
  screenshot_url?: string;
  stop_loss?: number;
  target_price?: number;
  timeframe?: string;
  reason?: string;
}

interface Stats {
  totalTrades: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  winRate: number;
  openPositions: number;
}

export default function TradesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'win' | 'loss'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'symbol'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [chartTrade, setChartTrade] = useState<Trade | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    totalPnL: 0,
    avgWin: 0,
    avgLoss: 0,
    winRate: 0,
    openPositions: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchTrades();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [trades, searchQuery, filterStatus, sortBy, sortOrder]);

  async function fetchTrades() {
    try {
      setLoading(true);
      const response = await fetch('/api/trades');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const fetchedTrades = data.trades || [];

      setTrades(fetchedTrades);
      calculateStats(fetchedTrades);
    } catch (error: any) {
      console.error('Error fetching trades:', error);
      alert('Failed to load trades: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(tradesList: Trade[]) {
    const totalTrades = tradesList.length;
    const openPositions = tradesList.filter((t: Trade) => t.status === 'open').length;
    const closedTrades = tradesList.filter((t: Trade) => t.status !== 'open');

    const totalPnL = tradesList.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const winTrades = tradesList.filter((t: Trade) => t.status === 'win');
    const lossTrades = tradesList.filter((t: Trade) => t.status === 'loss');

    const avgWin = winTrades.length > 0
      ? winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winTrades.length
      : 0;

    const avgLoss = lossTrades.length > 0
      ? lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / lossTrades.length
      : 0;

    const winRate = closedTrades.length > 0
      ? (winTrades.length / closedTrades.length) * 100
      : 0;

    setStats({
      totalTrades,
      totalPnL,
      avgWin,
      avgLoss,
      winRate,
      openPositions,
    });
  }

  function applyFilters() {
    let filtered = [...trades];

    if (searchQuery) {
      filtered = filtered.filter((trade: Trade) =>
        trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.setup_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'closed') {
        filtered = filtered.filter((t: Trade) => t.status !== 'open');
      } else {
        filtered = filtered.filter((t: Trade) => t.status === filterStatus);
      }
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime();
      } else if (sortBy === 'pnl') {
        comparison = (a.pnl || 0) - (b.pnl || 0);
      } else if (sortBy === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredTrades(filtered);
  }

  async function deleteTrade(id: string) {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      const response = await fetch(`/api/trades/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trade');
      }

      alert('✅ Trade deleted successfully!');
      fetchTrades();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  }

  function handleViewTrade(trade: Trade) {
    setSelectedTrade(trade);
  }

  function handleViewChart(trade: Trade) {
    setChartTrade(trade);
  }

  function handleEditTrade(tradeId: string) {
    router.push(`/trades/edit/${tradeId}`);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-up">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-medium">Loading trades…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-gradient">Trading Journal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="px-3 py-1.5 text-sm font-medium transition-colors rounded-lg hover:bg-white/5" style={{color:'var(--text-secondary)'}}>
                ← Dashboard
              </button>
            </Link>
            <ThemeToggle />
            <span className="text-sm hidden sm:block theme-text-muted">  
              {session?.user?.name || session?.user?.email}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* HEADER */}
        <div className="mb-6 animate-fade-up">
          <h1 className="text-3xl font-black theme-text-primary">All Trades</h1>
          <p className="mt-1 theme-text-muted">Manage and analyze your trading history</p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 stagger">
          <div className="rounded-2xl p-4 border hover:-translate-y-1 transition-all duration-300 backdrop-blur-xl" style={{background:'var(--bg-card)',borderColor:'rgba(59,130,246,0.20)'}}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Total Trades</span>
            </div>
            <p className="text-2xl font-black theme-text-primary">{stats.totalTrades}</p>
            <p className="text-xs mt-1 theme-text-muted">
              {stats.openPositions} open · {stats.totalTrades - stats.openPositions} closed
            </p>
          </div>

          <div className="rounded-2xl p-4 border border-emerald-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xl theme-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wide">Total P&L</span>
            </div>
            <p className={`text-2xl font-black ${stats.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              ₹{stats.totalPnL.toFixed(2)}
            </p>
            <p className="text-xs mt-1 theme-text-muted">
              Avg W: ₹{stats.avgWin.toFixed(0)} · Avg L: ₹{stats.avgLoss.toFixed(0)}
            </p>
          </div>

          <div className="rounded-2xl p-4 border border-purple-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xl theme-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
                <Filter className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase tracking-wide">Win Rate</span>
            </div>
            <p className="text-2xl font-black theme-text-primary">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs mt-1 theme-text-muted">
              {stats.winRate >= 50 ? '✅ Above average' : '⚠️ Below 50%'}
            </p>
          </div>

          <div className="rounded-2xl p-4 border border-amber-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xl theme-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-300 uppercase tracking-wide">Open Positions</span>
            </div>
            <p className="text-2xl font-black theme-text-primary">{stats.openPositions}</p>
            <p className="text-xs mt-1 theme-text-muted">Active in portfolio</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="rounded-2xl p-5 mb-5 border backdrop-blur-xl theme-card">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search symbol or setup…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-primary)'}}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all','open','closed','win','loss'] as const).map(f => (
                <button key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-200
                    ${ filterStatus === f
                      ? f === 'win' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : f === 'loss' ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                        : 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'border backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  style={filterStatus !== f ? {background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-muted)'} : {}}>
                  {f === 'all' ? '📊 All' : f === 'open' ? '🔓 Open' : f === 'closed' ? '🔒 Closed' : f === 'win' ? '✅ Winners' : '❌ Losers'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t theme-border">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border rounded-lg text-sm"
              style={{background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-primary)'}}
            >
              <option value="date">Date</option>
              <option value="pnl">P&L</option>
              <option value="symbol">Symbol</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg transition-colors border hover:shadow-md"
              style={{background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-primary)'}}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <div className="ml-auto flex gap-2">
              {(['table','cards'] as const).map(v => (
                <button key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                    ${viewMode === v ? 'bg-purple-600 text-white' : 'border hover:-translate-y-0.5'}`}
                  style={viewMode !== v ? {background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-muted)'} : {}}>
                  {v === 'table' ? '🔲 Table' : '🃏 Cards'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 text-xs text-slate-500">
          Showing {filteredTrades.length} of {trades.length} trades
        </div>

        {/* TRADES LIST */}
        {filteredTrades.length === 0 ? (
          <div className="border rounded-2xl p-12 text-center animate-scale-in theme-card">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-bold mb-2 theme-text-primary">No Trades Found</h3>
            <p className="mb-6 text-sm theme-text-muted">
              {trades.length === 0 ? 'Start by adding your first trade!' : 'Try adjusting your filters'}
            </p>
            <Link href="/trades/new">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl hover:from-blue-500 hover:to-blue-600 font-semibold text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20">
                ➕ Add First Trade
              </button>
            </Link>
          </div>
        ) : viewMode === 'table' ? (
          <div className="rounded-2xl overflow-hidden animate-fade-up border backdrop-blur-md theme-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b theme-surface">
                  <tr>
                    {['Symbol','Type','Entry','Exit','P&L','Status','Date','Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredTrades.map((trade: Trade) => (
                    <tr key={trade.id} className="transition-colors hover:bg-[var(--bg-card-hover)]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center border theme-surface">
                            <BarChart3 className="w-3.5 h-3.5 theme-text-muted" />
                          </div>
                          <div>
                            <p className="font-bold text-sm theme-text-primary">{trade.symbol}</p>
                            <p className="text-xs theme-text-muted">{trade.setup_type || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          trade.trade_type === 'long'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}>
                          {trade.trade_type === 'long' ? '▲ LONG' : '▼ SHORT'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold theme-text-primary">{trade.entry_price.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold theme-text-primary">
                          {trade.exit_price ? trade.exit_price.toFixed(2) : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-black ${
                          trade.pnl && trade.pnl > 0 ? 'text-emerald-400' :
                          trade.pnl && trade.pnl < 0 ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {trade.pnl ? `₹${trade.pnl.toFixed(2)}` : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          trade.status === 'win' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                          trade.status === 'loss' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                          trade.status === 'open' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                          'bg-slate-700/60 text-slate-400'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-400">{new Date(trade.entry_time).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewChart(trade)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="View Chart">
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleViewTrade(trade)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEditTrade(trade.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteTrade(trade.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrades.map((trade: Trade) => (
              <div key={trade.id}
                className="rounded-2xl p-5 border hover:-translate-y-1 hover:shadow-xl transition-all duration-300 theme-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black theme-text-primary">{trade.symbol}</h3>
                    <p className="text-xs theme-text-muted">{trade.setup_type || 'No setup'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    trade.status === 'win' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                    trade.status === 'loss' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                    'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                  }`}>
                    {trade.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-500">Entry</span>
                    <span className="font-semibold text-slate-300">₹{trade.entry_price.toFixed(2)}</span>
                  </div>
                  {trade.pnl !== null && trade.pnl !== undefined && (
                    <div className="flex justify-between text-sm p-2.5 bg-slate-900/60 rounded-lg">
                      <span className="text-slate-500">P&L</span>
                      <span className={`font-black ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{trade.pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-700/40">
                  <button onClick={() => handleViewChart(trade)}
                    className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1 transition-all">
                    <BarChart3 className="w-3.5 h-3.5" /> Chart
                  </button>
                  <button onClick={() => handleViewTrade(trade)}
                    className="flex-1 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/20 text-xs font-bold transition-all">
                    View
                  </button>
                  <button onClick={() => handleEditTrade(trade.id)}
                    className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/20 text-xs font-bold transition-all">
                    Edit
                  </button>
                  <button onClick={() => deleteTrade(trade.id)}
                    className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/trades/new">
          <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600
                             text-white rounded-full shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50
                             hover:scale-110 active:scale-100 transition-all duration-200 z-20 flex items-center justify-center text-2xl font-bold">
            +
          </button>
        </Link>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          isOpen={true}
          onClose={() => setSelectedTrade(null)}
        />
      )}

      {/* Trade Chart Modal */}
      {chartTrade && (
        <TradeChartModal
          trade={chartTrade}
          onClose={() => setChartTrade(null)}
        />
      )}
    </div>
  );
}