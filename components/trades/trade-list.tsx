'use client';

import { useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2, TrendingUp, TrendingDown, Eye, X, Save } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  asset_type?: string;
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  target_price?: number;
  quantity: number;
  position_size: number;
  pnl?: number;
  pnl_percentage?: number;
  status: string;
  entry_time: string;
  exit_time?: string;
  timeframe?: string;
  setup_type?: string;
  reason?: string;
  emotions?: string[];
  tags?: string[];
  screenshot_url?: string;
  created_at?: string;
  updated_at?: string;
}

export default function TradeList() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Modals
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Debug - Check when selectedTrade changes
  useEffect(() => {
    console.log('🔍 Selected Trade Changed:', selectedTrade);
  }, [selectedTrade]);

  // Fetch trades
  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trades');
      const data = await response.json();
      console.log('✅ Trades fetched:', data.trades?.length);
      setTrades(data.trades || []);
    } catch (error) {
      console.error('❌ Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.exit_price && t.pnl != null);
    const openTrades = trades.filter((t) => !t.exit_price);
    const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0);
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0;

    return {
      total: trades.length,
      open: openTrades.length,
      closed: closedTrades.length,
      winning: winningTrades.length,
      losing: losingTrades.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss
    };
  }, [trades]);

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades];

    if (searchQuery) {
      filtered = filtered.filter((t) => 
        (t.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.setup_type || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType === 'open') {
      filtered = filtered.filter((t) => !t.exit_price);
    } else if (filterType === 'closed') {
      filtered = filtered.filter((t) => t.exit_price);
    } else if (filterType === 'winning') {
      filtered = filtered.filter((t) => t.exit_price && (t.pnl || 0) > 0);
    } else if (filterType === 'losing') {
      filtered = filtered.filter((t) => t.exit_price && (t.pnl || 0) < 0);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        const dateA = new Date(a.entry_time || a.created_at || 0).getTime();
        const dateB = new Date(b.entry_time || b.created_at || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'pnl') {
        comparison = (a.pnl || 0) - (b.pnl || 0);
      } else if (sortBy === 'symbol') {
        comparison = (a.symbol || '').localeCompare(b.symbol || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [trades, searchQuery, filterType, sortBy, sortOrder]);

  // Delete handler
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/trades?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      await fetchTrades();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Failed to delete trade: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Update handler
  const handleUpdate = async () => {
    if (!editingTrade) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTrade),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      await fetchTrades();
      setEditingTrade(null);
    } catch (error: any) {
      console.error('Update error:', error);
      alert('Failed to update trade: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Helper functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--';
    }
  };

  const getPnLColor = (pnl?: number | null) => {
    if (!pnl || pnl === 0) return 'text-gray-600';
    return pnl > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'win':
        return 'bg-green-100 text-green-800';
      case 'loss':
        return 'bg-red-100 text-red-800';
      case 'breakeven':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAssetIcon = (assetType?: string) => {
    const icons: any = {
      stock: '📈',
      forex: '💱',
      crypto: '₿',
      option: '📊'
    };
    return icons[assetType || ''] || '💼';
  };

  // Eye button click handler
  const handleViewTrade = (trade: Trade) => {
    console.log('👁️ Eye Button Clicked!');
    console.log('Trade ID:', trade.id);
    console.log('Trade Symbol:', trade.symbol);
    console.log('Setting selectedTrade to:', trade);
    setSelectedTrade(trade);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading trades...</span>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Trades Yet</h2>
          <p className="text-gray-600 mb-6">Start by adding your first trade!</p>
          <button
            onClick={() => window.location.href = '/trades/new'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Add Your First Trade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Debug Indicator */}
      {selectedTrade && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]">
          ✅ Modal Should Be Open: {selectedTrade.symbol}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trades</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.open} open · {stats.closed} closed
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total P&L</p>
              <p className={`text-3xl font-bold ${getPnLColor(stats.totalPnL)}`}>
                {stats.totalPnL > 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="text-4xl">{stats.totalPnL >= 0 ? '💰' : '📉'}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Avg Win: ${stats.avgWin.toFixed(2)} · Avg Loss: ${stats.avgLoss.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className={`text-3xl font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.winning} wins · {stats.losing} losses
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Positions</p>
              <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="text-4xl">🔓</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Active trades in portfolio
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search symbol or setup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'closed', 'winning', 'losing'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' && '📋 All'}
                {type === 'open' && '🔓 Open'}
                {type === 'closed' && '🔒 Closed'}
                {type === 'winning' && '✅ Winners'}
                {type === 'losing' && '❌ Losers'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              📊 Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              🎴 Cards
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 items-center">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="date">Date</option>
            <option value="pnl">P&L</option>
            <option value="symbol">Symbol</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
          >
            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 px-2">
        Showing {filteredTrades.length} of {trades.length} trades
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Exit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-lg font-medium">No trades found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getAssetIcon(trade.asset_type)}</span>
                          <div>
                            <div className="font-bold text-gray-900">{trade.symbol || '--'}</div>
                            {trade.setup_type && (
                              <div className="text-xs text-gray-500">{trade.setup_type}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          trade.trade_type === 'long' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.trade_type === 'long' ? '🟢' : '🔴'}
                          {(trade.trade_type || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${trade.entry_price ? Number(trade.entry_price).toFixed(2) : '--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {trade.exit_price ? `$${Number(trade.exit_price).toFixed(2)}` : '--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${getPnLColor(trade.pnl)}`}>
                          {trade.pnl !== null && trade.pnl !== undefined
                            ? `${trade.pnl > 0 ? '+' : ''}$${Number(trade.pnl).toFixed(2)}`
                            : '--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(trade.status)}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(trade.entry_time || trade.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewTrade(trade);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('✏️ Edit clicked:', trade.id);
                              setEditingTrade(trade);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit trade"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🗑️ Delete clicked:', trade.id);
                              setDeleteConfirm(trade.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete trade"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredTrades.map((trade) => (
            <div
              key={trade.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getAssetIcon(trade.asset_type)}</span>
                    <h3 className="text-xl font-bold text-gray-900">{trade.symbol}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                      {trade.status.toUpperCase()}
                    </span>
                    <span className="text-sm flex items-center gap-1">
                      {trade.trade_type === 'long' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-gray-600 capitalize">{trade.trade_type}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Entry Price</p>
                      <p className="font-semibold text-gray-900">${trade.entry_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Exit Price</p>
                      <p className="font-semibold text-gray-900">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : <span className="text-blue-600">Open</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Quantity</p>
                      <p className="font-semibold text-gray-900">{trade.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">P&L</p>
                      <p className={`font-bold ${getPnLColor(trade.pnl)}`}>
                        {trade.pnl !== null && trade.pnl !== undefined
                          ? `$${trade.pnl.toFixed(2)} (${trade.pnl_percentage?.toFixed(2)}%)`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {trade.reason && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {trade.reason}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    📅 {formatDate(trade.entry_time)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewTrade(trade)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingTrade(trade)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title="Edit trade"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(trade.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete trade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Detail Modal - SIMPLIFIED VERSION */}
      {selectedTrade && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => {
            console.log('🖱️ Backdrop clicked - closing modal');
            setSelectedTrade(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              console.log('🖱️ Modal content clicked - not closing');
            }}
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getAssetIcon(selectedTrade.asset_type)}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTrade.symbol}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedTrade.trade_type === 'long' ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> Long Position
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" /> Short Position
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  console.log('❌ Close button clicked');
                  setSelectedTrade(null);
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedTrade.status)}`}>
                  {selectedTrade.status.toUpperCase()}
                </span>
                {selectedTrade.setup_type && (
                  <span className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                    {selectedTrade.setup_type}
                  </span>
                )}
              </div>

              {/* Price Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Price Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entry Price</p>
                    <p className="text-lg font-bold text-gray-900">${selectedTrade.entry_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Exit Price</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedTrade.exit_price ? `$${selectedTrade.exit_price.toFixed(2)}` : (
                        <span className="text-blue-600">Open</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Stop Loss</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedTrade.stop_loss ? `$${selectedTrade.stop_loss.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Target Price</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedTrade.target_price ? `$${selectedTrade.target_price.toFixed(2)}` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Position Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Position Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                    <p className="text-lg font-bold text-gray-900">{selectedTrade.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Position Size</p>
                    <p className="text-lg font-bold text-gray-900">${selectedTrade.position_size.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Timeframe</p>
                    <p className="text-lg font-bold text-gray-900">{selectedTrade.timeframe || '-'}</p>
                  </div>
                </div>
              </div>

              {/* P&L Section */}
              {selectedTrade.pnl !== null && selectedTrade.pnl !== undefined && (
                <div className={`rounded-lg p-4 ${selectedTrade.pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <h3 className="font-semibold text-gray-700 mb-3">Profit & Loss</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">P&L Amount</p>
                      <p className={`text-2xl font-bold ${getPnLColor(selectedTrade.pnl)}`}>
                        {selectedTrade.pnl > 0 ? '+' : ''}${selectedTrade.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">P&L Percentage</p>
                      <p className={`text-2xl font-bold ${getPnLColor(selectedTrade.pnl)}`}>
                        {selectedTrade.pnl_percentage ? (
                          `${selectedTrade.pnl_percentage > 0 ? '+' : ''}${selectedTrade.pnl_percentage.toFixed(2)}%`
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trade Reason */}
              {selectedTrade.reason && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Trade Reason</h3>
                  <p className="text-gray-800">{selectedTrade.reason}</p>
                </div>
              )}

              {/* Emotions & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTrade.emotions && selectedTrade.emotions.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Emotions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrade.emotions.map((emotion, i) => (
                        <span key={i} className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrade.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entry Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      📅 {formatDate(selectedTrade.entry_time)}
                    </p>
                  </div>
                  {selectedTrade.exit_time && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Exit Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        📅 {formatDate(selectedTrade.exit_time)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Screenshot */}
              {selectedTrade.screenshot_url && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Screenshot</h3>
                  <p className="text-sm text-gray-600">📸 Screenshot available</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    console.log('✏️ Opening edit modal from view modal');
                    setSelectedTrade(null);
                    setEditingTrade(selectedTrade);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Trade
                </button>
                <button
                  onClick={() => {
                    console.log('❌ Closing modal');
                    setSelectedTrade(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Trade</h2>
              <button onClick={() => setEditingTrade(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Symbol</label>
                  <input
                    type="text"
                    value={editingTrade.symbol}
                    onChange={(e) => setEditingTrade({...editingTrade, symbol: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trade Type</label>
                  <select
                    value={editingTrade.trade_type}
                    onChange={(e) => setEditingTrade({...editingTrade, trade_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTrade.entry_price}
                    onChange={(e) => setEditingTrade({...editingTrade, entry_price: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTrade.exit_price || ''}
                    onChange={(e) => setEditingTrade({...editingTrade, exit_price: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editingTrade.quantity}
                    onChange={(e) => setEditingTrade({...editingTrade, quantity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editingTrade.status}
                    onChange={(e) => setEditingTrade({...editingTrade, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="open">Open</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Breakeven</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trade Reason</label>
                <textarea
                  value={editingTrade.reason || ''}
                  onChange={(e) => setEditingTrade({...editingTrade, reason: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingTrade(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={updating}
                >
                  <Save className="w-4 h-4" />
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Trade?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this trade? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Trade Button */}
      <button
        onClick={() => window.location.href = '/trades/new'}
        className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-4 rounded-full shadow-lg hover:bg-blue-700 font-semibold text-lg flex items-center gap-2 transition-transform hover:scale-105 z-50"
      >
        <span className="text-2xl">+</span>
        Add Trade
      </button>
    </div>
  );
}