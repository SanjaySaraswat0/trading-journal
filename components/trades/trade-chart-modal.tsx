// File: components/trades/trade-chart-modal.tsx
// ✅ PROFESSIONAL TRADING CHART - TradingView Style

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
  const [timeframe, setTimeframe] = useState('5m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [hoveredCandle, setHoveredCandle] = useState<{ data: ChartData; x: number } | null>(null);

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
      if (!trade.symbol || !trade.entry_time) {
        throw new Error('Invalid trade data');
      }

      console.log(`📊 Fetching chart: ${trade.symbol} | ${timeframe}`);

      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: trade.symbol,
          timeframe,
          entry_time: trade.entry_time, // API extracts date from this
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chart data');
      }

      if (!data.chartData || data.chartData.length === 0) {
        throw new Error('No chart data available for this trading session');
      }

      setChartData(data.chartData);
      setAnalysis(data.analysis);
      
      console.log(`✅ Loaded ${data.chartData.length} candles`);
    } catch (err: any) {
      console.error('Chart error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Format time for display
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Get entry/exit time markers
  const getEntryMarker = () => {
    if (!trade.entry_time || chartData.length === 0) return null;
    const entryTime = new Date(trade.entry_time).getTime();
    
    const closestIndex = chartData.findIndex((candle, idx) => {
      const candleTime = new Date(candle.time).getTime();
      const nextCandleTime = chartData[idx + 1] ? new Date(chartData[idx + 1].time).getTime() : Infinity;
      return entryTime >= candleTime && entryTime < nextCandleTime;
    });
    
    return closestIndex >= 0 ? closestIndex : null;
  };

  const getExitMarker = () => {
    if (!trade.exit_time || chartData.length === 0) return null;
    const exitTime = new Date(trade.exit_time).getTime();
    
    const closestIndex = chartData.findIndex((candle, idx) => {
      const candleTime = new Date(candle.time).getTime();
      const nextCandleTime = chartData[idx + 1] ? new Date(chartData[idx + 1].time).getTime() : Infinity;
      return exitTime >= candleTime && exitTime < nextCandleTime;
    });
    
    return closestIndex >= 0 ? closestIndex : null;
  };

  // Render candlestick
  const renderCandlestick = (candle: ChartData, index: number, maxPrice: number, minPrice: number) => {
    const isGreen = candle.close >= candle.open;
    const priceRange = maxPrice - minPrice || 1;
    const chartHeight = 300;
    
    const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * chartHeight;
    const bodyTop = (maxPrice - Math.max(candle.open, candle.close)) / priceRange * chartHeight;
    const wickTop = (maxPrice - candle.high) / priceRange * chartHeight;
    const wickBottom = (maxPrice - candle.low) / priceRange * chartHeight;

    const entryIdx = getEntryMarker();
    const exitIdx = getExitMarker();
    const isEntry = index === entryIdx;
    const isExit = index === exitIdx;

    const candleWidth = Math.max(3, Math.min(12, 800 / chartData.length));

    return (
      <div 
        key={index} 
        className="relative cursor-crosshair"
        style={{ width: `${candleWidth}px`, height: `${chartHeight}px` }}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredCandle({ data: candle, x: rect.left });
        }}
        onMouseLeave={() => setHoveredCandle(null)}
      >
        {/* Wick */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-px bg-gray-600"
          style={{
            top: `${wickTop}px`,
            height: `${wickBottom - wickTop}px`
          }}
        />
        
        {/* Body */}
        <div
          className={`absolute left-0 w-full ${
            isGreen ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{
            top: `${bodyTop}px`,
            height: `${Math.max(bodyHeight, 1)}px`
          }}
        />

        {/* Entry Marker */}
        {isEntry && (
          <>
            <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg">
                ▼ ENTRY
              </div>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-blue-600 whitespace-nowrap" style={{ top: `${bodyTop - 18}px` }}>
              ₹{trade.entry_price.toFixed(2)}
            </div>
          </>
        )}

        {/* Exit Marker */}
        {isExit && (
          <>
            <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-orange-500 z-10" />
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg">
                ▲ EXIT
              </div>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-orange-600 whitespace-nowrap" style={{ top: `${bodyTop - 18}px` }}>
              ₹{trade.exit_price?.toFixed(2)}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E222D] rounded-lg shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{trade.symbol}</h2>
            <div className="text-sm text-gray-400">
              {new Date(trade.entry_time).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
            {analysis && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">O:</span>
                <span className="font-mono">{analysis.open?.toFixed(2)}</span>
                <span className="text-gray-400">H:</span>
                <span className="font-mono text-green-400">{analysis.high?.toFixed(2)}</span>
                <span className="text-gray-400">L:</span>
                <span className="font-mono text-red-400">{analysis.low?.toFixed(2)}</span>
                <span className="text-gray-400">C:</span>
                <span className="font-mono">{analysis.close?.toFixed(2)}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#131722] border-b border-gray-700">
          <span className="text-xs text-gray-400 mr-2">Timeframe:</span>
          {['5m', '15m', '1H', '1D'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              disabled={loading}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2A2E39] text-gray-300 hover:bg-[#363A45]'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative overflow-hidden bg-[#131722]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/90 z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading chart...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-red-500 mb-2">Chart Error</h3>
                    <p className="text-gray-300 mb-4">{error}</p>
                    <button
                      onClick={fetchChartData}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <div className="h-full p-4 overflow-x-auto">
              {/* Chart Canvas */}
              <div className="relative">
                {/* Price Axis (Y) */}
                <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-400 font-mono pr-2">
                  <span>{Math.max(...chartData.map(c => c.high)).toFixed(2)}</span>
                  <span>{((Math.max(...chartData.map(c => c.high)) + Math.min(...chartData.map(c => c.low))) / 2).toFixed(2)}</span>
                  <span>{Math.min(...chartData.map(c => c.low)).toFixed(2)}</span>
                </div>

                {/* Candlesticks */}
                <div className="ml-16">
                  <div className="flex items-end gap-0.5 min-w-max py-8">
                    {chartData.map((candle, idx) => 
                      renderCandlestick(
                        candle, 
                        idx, 
                        Math.max(...chartData.map(c => c.high)),
                        Math.min(...chartData.map(c => c.low))
                      )
                    )}
                  </div>
                  
                  {/* Time Axis (X) */}
                  <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                    <span>{formatTime(chartData[0]?.time)}</span>
                    {chartData.length > 10 && (
                      <>
                        <span>{formatTime(chartData[Math.floor(chartData.length * 0.33)]?.time)}</span>
                        <span>{formatTime(chartData[Math.floor(chartData.length * 0.66)]?.time)}</span>
                      </>
                    )}
                    <span>{formatTime(chartData[chartData.length - 1]?.time)}</span>
                  </div>
                </div>

                {/* Hover Tooltip */}
                {hoveredCandle && (
                  <div 
                    className="fixed bg-[#1E222D] border border-gray-600 rounded shadow-lg p-3 text-xs z-50"
                    style={{ 
                      left: `${hoveredCandle.x}px`, 
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="font-bold mb-2 text-blue-400">{formatTime(hoveredCandle.data.time)}</div>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Open:</span>
                        <span className="text-white font-semibold">₹{hoveredCandle.data.open.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">High:</span>
                        <span className="text-green-400 font-semibold">₹{hoveredCandle.data.high.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Low:</span>
                        <span className="text-red-400 font-semibold">₹{hoveredCandle.data.low.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Close:</span>
                        <span className="text-white font-semibold">₹{hoveredCandle.data.close.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
                        <span className="text-gray-400">Volume:</span>
                        <span className="text-gray-300">{hoveredCandle.data.volume.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-[#1E222D]">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-400">Entry: ₹{trade.entry_price.toFixed(2)}</span>
            </div>
            {trade.exit_price && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-gray-400">Exit: ₹{trade.exit_price.toFixed(2)}</span>
              </div>
            )}
            {analysis && (
              <div className="flex items-center gap-2">
                {analysis.trend === 'bullish' ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className="text-gray-400">{analysis.market_context}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2A2E39] hover:bg-[#363A45] rounded text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}