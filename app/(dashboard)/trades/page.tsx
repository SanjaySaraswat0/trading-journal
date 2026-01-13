'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TradeDetailModal from '@/components/trades/trade-detail-modal';
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
  exit_price: number | null;
  quantity: number;
  position_size: number;
  pnl: number | null;
  pnl_percentage: number | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  setup_type: string | null;
  screenshot_url: string | null;
  stop_loss: number | null;
  target_price: number | null;
  timeframe: string | null;
  reason: string | null;
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
    const openPositions = tradesList.filter(t => t.status === 'open').length;
    const closedTrades = tradesList.filter(t => t.status !== 'open');
    
    const totalPnL = tradesList.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    const winTrades = tradesList.filter(t => t.status === 'win');
    const lossTrades = tradesList.filter(t => t.status === 'loss');
    
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
      filtered = filtered.filter(trade =>
        trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.setup_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'closed') {
        filtered = filtered.filter(t => t.status !== 'open');
      } else {
        filtered = filtered.filter(t => t.status === filterStatus);
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

  function handleEditTrade(tradeId: string) {
    router.push(`/trades/edit/${tradeId}`);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
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
            <span className="text-sm text-gray-600">
              {session?.user?.name || session?.user?.email}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Trades</h1>
          <p className="text-gray-600 mt-1">Manage and analyze your trading history</p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Trades</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTrades}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.openPositions} open · {stats.totalTrades - stats.openPositions} closed
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Total P&L</span>
            </div>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalPnL.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg Win: ${stats.avgWin.toFixed(2)} · Avg Loss: ${stats.avgLoss.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600">Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.winRate >= 50 ? '✅ Above average' : '⚠️ Below 50%'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600">Open Positions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.openPositions}</p>
            <p className="text-xs text-gray-500 mt-1">Active trades in portfolio</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="🔍 Search symbol or setup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 All
              </button>
              <button
                onClick={() => setFilterStatus('open')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatus === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔓 Open
              </button>
              <button
                onClick={() => setFilterStatus('closed')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatus === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔒 Closed
              </button>
              <button
                onClick={() => setFilterStatus('win')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatus === 'win' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✅ Winners
              </button>
              <button
                onClick={() => setFilterStatus('loss')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatus === 'loss' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ❌ Losers
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Date</option>
              <option value="pnl">P&L</option>
              <option value="symbol">Symbol</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                🔲 Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                🃏 Cards
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTrades.length} of {trades.length} trades
        </div>

        {/* TRADES LIST */}
        {filteredTrades.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trades Found</h3>
            <p className="text-gray-600 mb-6">
              {trades.length === 0 ? "Start by adding your first trade!" : "Try adjusting your filters"}
            </p>
            <Link href="/trades/new">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
                ➕ Add First Trade
              </button>
            </Link>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📊</span>
                          <div>
                            <p className="font-semibold text-gray-900">{trade.symbol}</p>
                            <p className="text-xs text-gray-500">{trade.setup_type || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          trade.trade_type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.trade_type === 'long' ? '🟢 LONG' : '🔴 SHORT'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">${trade.entry_price.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-bold ${
                          trade.pnl && trade.pnl > 0 ? 'text-green-600' :
                          trade.pnl && trade.pnl < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          trade.status === 'win' ? 'bg-green-100 text-green-800' :
                          trade.status === 'loss' ? 'bg-red-100 text-red-800' :
                          trade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{new Date(trade.entry_time).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewTrade(trade)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditTrade(trade.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                            title="Edit Trade"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTrade(trade.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-4 h-4" />
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
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{trade.symbol}</h3>
                    <p className="text-xs text-gray-500">{trade.setup_type || 'No setup'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.status === 'win' ? 'bg-green-100 text-green-800' :
                    trade.status === 'loss' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {trade.status}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Entry:</span>
                    <span className="font-medium">${trade.entry_price.toFixed(2)}</span>
                  </div>
                  {trade.pnl !== null && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-gray-600">P&L:</span>
                      <span className={`font-bold ${trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleViewTrade(trade)}
                    className="flex-1 py-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 text-sm font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEditTrade(trade.id)}
                    className="flex-1 py-2 text-orange-600 bg-orange-50 rounded hover:bg-orange-100 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTrade(trade.id)}
                    className="px-3 py-2 text-red-600 bg-red-50 rounded hover:bg-red-100 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/trades/new">
          <button className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all z-20">
            <span className="text-2xl">➕</span>
          </button>
        </Link>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
}