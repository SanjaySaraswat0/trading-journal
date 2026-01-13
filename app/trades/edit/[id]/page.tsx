'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface TradeFormData {
  symbol: string;
  asset_type: string;
  trade_type: string;
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  target_price: string;
  quantity: string;
  position_size: string;
  entry_time: string;
  exit_time: string;
  timeframe: string;
  setup_type: string;
  reason: string;
}

export default function EditTradePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>(); // Fixed: Type annotation
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trade, setTrade] = useState<any>(null);
  
  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    asset_type: 'stock',
    trade_type: 'long',
    entry_price: '',
    exit_price: '',
    stop_loss: '',
    target_price: '',
    quantity: '',
    position_size: '',
    entry_time: '',
    exit_time: '',
    timeframe: '1d',
    setup_type: '',
    reason: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // params.id is directly accessible in Next.js 16
    if (params?.id && session) {
      fetchTrade(params.id);
    }
  }, [params?.id, session]);

  async function fetchTrade(id: string) {
    try {
      setLoading(true);
      console.log('Fetching trade:', id);
      
      const response = await fetch(`/api/trades/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch trade');
      }

      const data = await response.json();
      const fetchedTrade = data.trade;
      
      console.log('Trade loaded:', fetchedTrade);
      
      setTrade(fetchedTrade);
      
      // Populate form
      setFormData({
        symbol: fetchedTrade.symbol || '',
        asset_type: fetchedTrade.asset_type || 'stock',
        trade_type: fetchedTrade.trade_type || 'long',
        entry_price: fetchedTrade.entry_price?.toString() || '',
        exit_price: fetchedTrade.exit_price?.toString() || '',
        stop_loss: fetchedTrade.stop_loss?.toString() || '',
        target_price: fetchedTrade.target_price?.toString() || '',
        quantity: fetchedTrade.quantity?.toString() || '',
        position_size: fetchedTrade.position_size?.toString() || '',
        entry_time: fetchedTrade.entry_time || '',
        exit_time: fetchedTrade.exit_time || '',
        timeframe: fetchedTrade.timeframe || '1d',
        setup_type: fetchedTrade.setup_type || '',
        reason: fetchedTrade.reason || '',
      });
    } catch (error: any) {
      console.error('Error loading trade:', error);
      alert('Error loading trade: ' + error.message);
      router.push('/trades');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Auto-calculate position size
  useEffect(() => {
    if (formData.entry_price && formData.quantity) {
      const entryPrice = parseFloat(formData.entry_price);
      const quantity = parseFloat(formData.quantity);
      if (!isNaN(entryPrice) && !isNaN(quantity)) {
        const positionSize = (entryPrice * quantity).toFixed(2);
        setFormData(prev => ({ ...prev, position_size: positionSize }));
      }
    }
  }, [formData.entry_price, formData.quantity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.symbol.trim() || !formData.entry_price || !formData.quantity) {
      alert('⚠️ Please fill all required fields');
      return;
    }

    if (!params?.id) {
      alert('⚠️ Trade ID not found');
      return;
    }

    setSaving(true);

    try {
      console.log('Updating trade:', params.id);
      
      const response = await fetch(`/api/trades/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Trade updated successfully!');
        router.push('/trades');
        router.refresh();
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to update trade'));
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert('❌ Submit error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trade...</p>
        </div>
      </div>
    );
  }

  if (!trade) {
    return null;
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
            <Link href="/trades">
              <button className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                ← Back to Trades
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Trade</h1>
          <p className="text-gray-600 mt-1">Update trade details for {trade.symbol}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="asset_type"
                  value={formData.asset_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="stock">📈 Stock</option>
                  <option value="forex">💱 Forex</option>
                  <option value="crypto">₿ Crypto</option>
                  <option value="option">📊 Option</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trade Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="trade_type"
                  value={formData.trade_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="long">🟢 Long (Buy)</option>
                  <option value="short">🔴 Short (Sell)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeframe
                </label>
                <select
                  name="timeframe"
                  value={formData.timeframe}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1min">1 Minute</option>
                  <option value="5min">5 Minutes</option>
                  <option value="15min">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Type
                </label>
                <select
                  name="setup_type"
                  value={formData.setup_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select setup</option>
                  <option value="breakout">🚀 Breakout</option>
                  <option value="pullback">🔄 Pullback</option>
                  <option value="range">↔️ Range</option>
                  <option value="reversal">🔃 Reversal</option>
                  <option value="trend">📈 Trend</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Position</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="entry_price"
                  value={formData.entry_price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="exit_price"
                  value={formData.exit_price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Size (Auto)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="position_size"
                  value={formData.position_size}
                  readOnly
                  className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stop Loss
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="stop_loss"
                  value={formData.stop_loss}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="target_price"
                  value={formData.target_price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Timing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="entry_time"
                  value={formData.entry_time ? formData.entry_time.slice(0, 16) : ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exit Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="exit_time"
                  value={formData.exit_time ? formData.exit_time.slice(0, 16) : ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Notes</h3>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              placeholder="Why did you take this trade? What was your analysis?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              {saving ? '💾 Saving...' : '✅ Update Trade'}
            </button>
            <Link href="/trades" className="flex-1">
              <button
                type="button"
                disabled={saving}
                className="w-full px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}