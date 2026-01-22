// File: src/components/trades/trade-chart-modal.tsx
// ✅ FIXED: Better Error Handling + Symbol Validation

'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

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
  const [timeframe, setTimeframe] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchChartData();
    }
  }, [isOpen, timeframe]);

  const fetchChartData = async () => {
    setLoading(true);
    setError('');
    setChartData([]);
    setAnalysis(null);

    try {
      // ✅ Validate symbol before API call
      if (!trade.symbol || trade.symbol.trim() === '') {
        throw new Error('Invalid symbol: Symbol is empty');
      }

      console.log(`📊 Fetching chart for: ${trade.symbol} (${timeframe})`);

      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: trade.symbol,
          timeframe,
          start: trade.entry_time,
          end: trade.exit_time || new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // ✅ Better error messages
        if (response.status === 404) {
          throw new Error(
            `❌ No data found for "${trade.symbol}".\n\n` +
            `💡 Tip: For NSE stocks, add .NS (e.g., RELIANCE.NS)\n` +
            `For BSE stocks, add .BO (e.g., RELIANCE.BO)`
          );
        }
        
        throw new Error(data.error || data.suggestion || 'Failed to fetch chart data');
      }

      if (!data.chartData || data.chartData.length === 0) {
        throw new Error(
          `❌ No chart data available for "${trade.symbol}".\n\n` +
          `Possible reasons:\n` +
          `• Symbol may be invalid or delisted\n` +
          `• Market data not available for this period\n` +
          `• Try a different timeframe`
        );
      }

      setChartData(data.chartData || []);
      setAnalysis(data.analysis || null);
      
      console.log(`✅ Loaded ${data.chartData.length} candles`);
    } catch (err: any) {
      console.error('Chart data error:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderCandlestick = (candle: ChartData, index: number) => {
    const isGreen = candle.close >= candle.open;
    const height = Math.abs(candle.close - candle.open) || 1;
    const maxPrice = Math.max(...chartData.map(c => c.high));
    const minPrice = Math.min(...chartData.map(c => c.low));
    const priceRange = maxPrice - minPrice || 1;
    
    const bodyHeight = (height / priceRange) * 200;
    const bodyTop = ((maxPrice - Math.max(candle.open, candle.close)) / priceRange) * 200;
    const wickTop = ((maxPrice - candle.high) / priceRange) * 200;
    const wickBottom = ((maxPrice - candle.low) / priceRange) * 200;

    return (
      <div key={index} className="relative" style={{ width: '10px', height: '250px' }}>
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-400"
          style={{
            top: `${wickTop}px`,
            height: `${wickBottom - wickTop}px`
          }}
        />
        <div
          className={`absolute left-0 w-full ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
          style={{
            top: `${bodyTop}px`,
            height: `${Math.max(bodyHeight, 2)}px`
          }}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {trade.symbol}
              <span className="text-sm font-normal text-gray-500">Chart Analysis</span>
            </h2>
            <p className="text-sm text-gray-600">
              Entry: {new Date(trade.entry_time).toLocaleDateString('en-IN')}
              {trade.exit_time && ` → Exit: ${new Date(trade.exit_time).toLocaleDateString('en-IN')}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">📊 Timeframe:</span>
            {['1d', '1h', '15min', '5min'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading chart data for {trade.symbol}...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          )}

          {/* ✅ IMPROVED: Better Error Display */}
          {error && !loading && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-800 mb-2">
                    Failed to Load Chart
                  </h3>
                  <div className="text-red-700 whitespace-pre-line mb-4">
                    {error}
                  </div>
                  <div className="bg-white p-4 rounded border border-red-200">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      🔧 Troubleshooting Steps:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Check if symbol "{trade.symbol}" is correct</li>
                      <li>For Indian stocks, use format: RELIANCE.NS or RELIANCE.BO</li>
                      <li>Try a different timeframe (1d works best)</li>
                      <li>Verify stock is actively traded</li>
                    </ul>
                  </div>
                  <button
                    onClick={fetchChartData}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <div>
              {/* Price Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Entry Price</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{trade.entry_price.toFixed(2)}
                  </p>
                </div>
                {trade.exit_price && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Exit Price</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₹{trade.exit_price.toFixed(2)}
                    </p>
                  </div>
                )}
                <div className={`p-4 rounded-lg ${
                  chartData[chartData.length - 1].close > chartData[0].open
                    ? 'bg-green-50'
                    : 'bg-red-50'
                }`}>
                  <p className="text-sm text-gray-600">Period Change</p>
                  <p className={`text-2xl font-bold ${
                    chartData[chartData.length - 1].close > chartData[0].open
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {((chartData[chartData.length - 1].close - chartData[0].open) / chartData[0].open * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {chartData.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Candles loaded</p>
                </div>
              </div>

              {/* Candlestick Chart */}
              <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
                <div className="flex items-end gap-1 min-w-max">
                  {chartData.map((candle, idx) => renderCandlestick(candle, idx))}
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{chartData[0]?.time}</span>
                  <span>{chartData[Math.floor(chartData.length / 2)]?.time}</span>
                  <span>{chartData[chartData.length - 1]?.time}</span>
                </div>
              </div>

              {/* Analysis Section */}
              {analysis && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-bold">📊 Market Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Trend</p>
                      <p className="text-lg font-bold capitalize flex items-center gap-2">
                        {analysis.trend === 'bullish' ? (
                          <><TrendingUp className="w-5 h-5 text-green-600" /> Bullish</>
                        ) : (
                          <><TrendingDown className="w-5 h-5 text-red-600" /> Bearish</>
                        )}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Volatility</p>
                      <p className="text-lg font-bold capitalize">{analysis.volatility}</p>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Volume Trend</p>
                      <p className="text-lg font-bold">{analysis.volume_trend}</p>
                    </div>
                  </div>

                  {analysis.market_context && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Market Context</p>
                      <p className="text-gray-700">{analysis.market_context}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !error && chartData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Chart Data</h3>
              <p className="text-gray-600 mb-4">
                No data available for {trade.symbol} ({timeframe})
              </p>
              <button
                onClick={fetchChartData}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                🔄 Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>💡 <strong>Tip:</strong> 1D timeframe works best for most stocks</p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}