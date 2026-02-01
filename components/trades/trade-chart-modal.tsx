// File: components/trades/trade-chart-modal.tsx
// ✅ FINAL VERSION with Fallback Warning Display

'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeChartModalProps {
  trade: {
    id: string;
    symbol: string;
    entry_time: string;
    exit_time?: string | null;
    entry_price: number;
    exit_price?: number | null;
    trade_type: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function TradeChartModal({ trade, isOpen, onClose }: TradeChartModalProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState('5m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [hoveredCandle, setHoveredCandle] = useState<ChartData | null>(null);
  const [warning, setWarning] = useState<string>(''); // ✅ Fallback warning

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, timeframe]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setWarning(''); // ✅ Clear previous warning
    
    try {
      const res = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: trade.symbol,
          timeframe,
          entry_time: trade.entry_time,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load');
      if (!data.chartData?.length) throw new Error('No data available');

      setChartData(data.chartData);
      setStats(data.stats);
      
      // ✅ Show warning if interval changed
      if (data.warning) {
        setWarning(data.warning);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Format time (HH:MM)
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const h = d.getUTCHours() + 5;
    const m = d.getUTCMinutes() + 30;
    const hour = (h + Math.floor(m / 60)) % 24;
    const min = m % 60;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  // Find entry/exit candle indices
  const findIndex = (targetTime: string) => {
    const target = new Date(targetTime).getTime();
    return chartData.findIndex((c, i) => {
      const t1 = new Date(c.time).getTime();
      const t2 = chartData[i + 1] ? new Date(chartData[i + 1].time).getTime() : Infinity;
      return target >= t1 && target < t2;
    });
  };

  const entryIdx = findIndex(trade.entry_time);
  const exitIdx = trade.exit_time ? findIndex(trade.exit_time) : -1;

  // Render candlestick
  const renderCandle = (candle: ChartData, idx: number, maxPrice: number, minPrice: number) => {
    const green = candle.close >= candle.open;
    const range = maxPrice - minPrice || 1;
    const h = 280;
    
    const bodyTop = ((maxPrice - Math.max(candle.open, candle.close)) / range) * h;
    const bodyHeight = (Math.abs(candle.close - candle.open) / range) * h;
    const wickTop = ((maxPrice - candle.high) / range) * h;
    const wickBottom = ((maxPrice - candle.low) / range) * h;

    const isEntry = idx === entryIdx;
    const isExit = idx === exitIdx;

    return (
      <div
        key={idx}
        className="relative cursor-pointer"
        style={{ width: '8px', height: `${h}px` }}
        onMouseEnter={() => setHoveredCandle(candle)}
        onMouseLeave={() => setHoveredCandle(null)}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 w-px bg-gray-400"
          style={{ top: `${wickTop}px`, height: `${wickBottom - wickTop}px` }}
        />
        
        <div
          className={`absolute left-0 w-full ${green ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ top: `${bodyTop}px`, height: `${Math.max(bodyHeight, 1)}px` }}
        />

        {isEntry && (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap z-20">
              ▼ BUY
            </div>
          </>
        )}

        {isExit && (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-orange-500 z-10" />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap z-20">
              ▲ SELL
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">{trade.symbol}</h2>
            <p className="text-sm text-gray-500">
              {new Date(trade.entry_time).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe buttons */}
        <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b">
          {['5m', '15m', '1H', '1D'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              disabled={loading}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } ${loading ? 'opacity-50' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* ✅ Fallback Warning */}
        {warning && (
          <div className="mx-4 mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        )}

        {/* Chart area */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                <h3 className="font-bold text-red-800 mb-2">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <div className="h-full p-6 overflow-x-auto">
              {/* Stats */}
              {stats && (
                <div className="flex gap-4 mb-4 text-sm">
                  <div>O: <span className="font-mono font-semibold">{stats.open.toFixed(2)}</span></div>
                  <div>H: <span className="font-mono font-semibold text-green-600">{stats.high.toFixed(2)}</span></div>
                  <div>L: <span className="font-mono font-semibold text-red-600">{stats.low.toFixed(2)}</span></div>
                  <div>C: <span className="font-mono font-semibold">{stats.close.toFixed(2)}</span></div>
                  <div className={stats.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.change >= 0 ? '+' : ''}{stats.change}%
                  </div>
                </div>
              )}

              {/* Chart with axes */}
              <div className="relative">
                {/* Y-axis (Price) */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2 text-right">
                  <span>{Math.max(...chartData.map(c => c.high)).toFixed(2)}</span>
                  <span>{((Math.max(...chartData.map(c => c.high)) + Math.min(...chartData.map(c => c.low))) / 2).toFixed(2)}</span>
                  <span>{Math.min(...chartData.map(c => c.low)).toFixed(2)}</span>
                </div>

                {/* Candles */}
                <div className="ml-16 mr-4">
                  <div className="flex items-end gap-0.5 pt-8 pb-2">
                    {chartData.map((candle, i) => 
                      renderCandle(
                        candle,
                        i,
                        Math.max(...chartData.map(c => c.high)),
                        Math.min(...chartData.map(c => c.low))
                      )
                    )}
                  </div>

                  {/* X-axis (Time) */}
                  <div className="flex justify-between text-xs text-gray-500 font-mono mt-2 border-t pt-2">
                    <span>{formatTime(chartData[0].time)}</span>
                    {chartData.length > 10 && (
                      <>
                        <span>{formatTime(chartData[Math.floor(chartData.length * 0.33)].time)}</span>
                        <span>{formatTime(chartData[Math.floor(chartData.length * 0.66)].time)}</span>
                      </>
                    )}
                    <span>{formatTime(chartData[chartData.length - 1].time)}</span>
                  </div>
                </div>

                {/* Hover tooltip */}
                {hoveredCandle && (
                  <div className="absolute top-4 left-20 bg-gray-900 text-white rounded-lg shadow-xl p-3 text-xs z-50">
                    <div className="font-bold text-blue-400 mb-2">{formatTime(hoveredCandle.time)}</div>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Open:</span>
                        <span>₹{hoveredCandle.open.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">High:</span>
                        <span className="text-green-400">₹{hoveredCandle.high.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Low:</span>
                        <span className="text-red-400">₹{hoveredCandle.low.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Close:</span>
                        <span>₹{hoveredCandle.close.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
                        <span className="text-gray-400">Vol:</span>
                        <span className="text-gray-300">{hoveredCandle.volume.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Entry: ₹{trade.entry_price.toFixed(2)}</span>
            </div>
            {trade.exit_price && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-gray-600">Exit: ₹{trade.exit_price.toFixed(2)}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}