// File: src/components/trades/trade-detail-modal.tsx
// UPDATED VERSION - View & Edit modes

'use client';

import { useState } from 'react';
import { X, Pencil, Save } from 'lucide-react';

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
}

interface TradeDetailModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function TradeDetailModal({ 
  trade, 
  isOpen, 
  onClose, 
  onUpdate 
}: TradeDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(trade);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: trade.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      setIsEditMode(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Trade' : 'Trade Details'}
          </h2>
          <div className="flex gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Symbol & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Symbol</label>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg font-bold">{trade.symbol}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
              {isEditMode ? (
                <select
                  value={formData.trade_type}
                  onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              ) : (
                <p className="text-lg font-semibold capitalize">{trade.trade_type}</p>
              )}
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Entry Price</label>
              {isEditMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({ ...formData, entry_price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg font-semibold">${trade.entry_price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Exit Price</label>
              {isEditMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.exit_price || ''}
                  onChange={(e) => setFormData({ ...formData, exit_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg font-semibold">
                  {trade.exit_price ? `$${trade.exit_price}` : 'Open'}
                </p>
              )}
            </div>
          </div>

          {/* Stop Loss & Target */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Stop Loss</label>
              {isEditMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.stop_loss || ''}
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg">{trade.stop_loss ? `$${trade.stop_loss}` : '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Target</label>
              {isEditMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.target_price || ''}
                  onChange={(e) => setFormData({ ...formData, target_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg">{trade.target_price ? `$${trade.target_price}` : '-'}</p>
              )}
            </div>
          </div>

          {/* Quantity & Position */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
              {isEditMode ? (
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg font-semibold">{trade.quantity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Position Size</label>
              {isEditMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.position_size}
                  onChange={(e) => setFormData({ ...formData, position_size: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg font-semibold">${trade.position_size}</p>
              )}
            </div>
          </div>

          {/* P&L */}
          {trade.pnl !== null && trade.pnl !== undefined && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Profit & Loss</label>
              <p className={`text-2xl font-bold ${
                trade.pnl > 0 ? 'text-green-600' : trade.pnl < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                ${trade.pnl.toFixed(2)} ({trade.pnl_percentage?.toFixed(2)}%)
              </p>
            </div>
          )}

          {/* Timeframe & Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Timeframe</label>
              {isEditMode ? (
                <select
                  value={formData.timeframe || ''}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select...</option>
                  <option value="1min">1 Min</option>
                  <option value="5min">5 Min</option>
                  <option value="15min">15 Min</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              ) : (
                <p className="text-lg">{trade.timeframe || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Setup Type</label>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.setup_type || ''}
                  onChange={(e) => setFormData({ ...formData, setup_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Breakout"
                />
              ) : (
                <p className="text-lg">{trade.setup_type || '-'}</p>
              )}
            </div>
          </div>

          {/* Entry & Exit Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Entry Time</label>
              {isEditMode ? (
                <input
                  type="datetime-local"
                  value={formData.entry_time?.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg">{new Date(trade.entry_time).toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Exit Time</label>
              {isEditMode ? (
                <input
                  type="datetime-local"
                  value={formData.exit_time?.slice(0, 16) || ''}
                  onChange={(e) => setFormData({ ...formData, exit_time: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-lg">
                  {trade.exit_time ? new Date(trade.exit_time).toLocaleString() : 'Open'}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Trade Reason</label>
            {isEditMode ? (
              <textarea
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Why did you take this trade?"
              />
            ) : (
              <p className="text-gray-700">{trade.reason || 'No reason provided'}</p>
            )}
          </div>

          {/* Status Badge */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              trade.status === 'win' ? 'bg-green-100 text-green-800' :
              trade.status === 'loss' ? 'bg-red-100 text-red-800' :
              trade.status === 'breakeven' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {trade.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer */}
        {isEditMode && (
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={() => {
                setIsEditMode(false);
                setFormData(trade);
                setError('');
              }}
              className="px-4 py-2 border rounded-lg hover:bg-white"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}