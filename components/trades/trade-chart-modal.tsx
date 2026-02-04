// components/trades/TradeChartModal.tsx
// CLEAN VERSION: No duplicate imports

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, BarChart3 } from 'lucide-react';

interface TradeChartModalProps {
  trade: {
    id: string;
    symbol: string;
    entry_price: number;
    exit_price?: number;
    entry_time: string;
  };
  onClose: () => void;
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  candle: ChartData | null;
}

export default function TradeChartModal({ trade, onClose }: TradeChartModalProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [actualInterval, setActualInterval] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, x: 0, y: 0, candle: null });
  const [showVolume, setShowVolume] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const timeframes = ['5m', '15m', '1h', '1d'];

  const isFutureDate = () => {
    const tradeDate = new Date(trade.entry_time);
    const today = new Date();
    return tradeDate > today;
  };

  const fetchChartData = async (timeframe: string) => {
    setLoading(true);
    setError(null);
    setWarning(null);

    if (isFutureDate()) {
      setLoading(false);
      setError('This trade is dated in the future. Chart data is only available for past dates.');
      return;
    }

    try {
      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: trade.symbol,
          timeframe: timeframe,
          entry_time: trade.entry_time
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch chart data');
      }

      const data = await response.json();
      setChartData(data.chartData || []);
      setActualInterval(data.actualInterval || timeframe);
      setStats(data.stats || null);
      setWarning(data.warning || null);

    } catch (err: any) {
      setError(err.message);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(selectedTimeframe);
  }, [selectedTimeframe]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatFullDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartWidth = 900;
  const chartHeight = showVolume ? 500 : 450;
  const volumeHeight = 80;
  const padding = { top: 30, right: 70, bottom: 50, left: 70 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const priceChartHeight = showVolume ? chartHeight - volumeHeight - 60 : chartHeight - padding.top - padding.bottom;

  const allPrices = chartData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.15;

  const yMin = minPrice - pricePadding;
  const yMax = maxPrice + pricePadding;

  const priceToY = (price: number) => {
    return padding.top + priceChartHeight - ((price - yMin) / (yMax - yMin)) * priceChartHeight;
  };

  const maxVolume = Math.max(...chartData.map(d => d.volume || 0));
  const volumeToHeight = (volume: number) => (volume / maxVolume) * volumeHeight;

  const totalCandles = chartData.length;
  const candleSpacing = 0.3;
  const candleWidth = Math.max(3, Math.min(20, (innerWidth / totalCandles) * (1 - candleSpacing)));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const candleIndex = Math.floor((mouseX - padding.left) / (innerWidth / chartData.length));

    if (candleIndex >= 0 && candleIndex < chartData.length) {
      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        candle: chartData[candleIndex]
      });
    } else {
      setTooltip({ visible: false, x: 0, y: 0, candle: null });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, candle: null });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{trade.symbol}</h2>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {new Date(trade.entry_time).toLocaleDateString('en-IN', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2.5 rounded-xl transition-all hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* TIMEFRAME BUTTONS */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    disabled={loading}
                    className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                      selectedTimeframe === tf
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  showVolume 
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' 
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                }`}
              >
                {showVolume ? '📊 Volume ON' : '📊 Volume OFF'}
              </button>
            </div>

            {!loading && chartData.length > 0 && actualInterval && (
              <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">
                <span className="text-gray-700">Requested:</span>
                <span className="font-bold text-indigo-600">{selectedTimeframe.toUpperCase()}</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-700">Showing:</span>
                <span className={`font-bold ${
                  actualInterval === selectedTimeframe ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {actualInterval.toUpperCase()}
                </span>
                {actualInterval !== selectedTimeframe && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md text-xs font-bold">
                    AUTO FALLBACK
                  </span>
                )}
              </div>
            )}
          </div>

          {/* WARNING */}
          {warning && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-900 mb-1">⚠️ Data Fallback Active</h4>
                  <p className="text-yellow-800">{warning}</p>
                  <p className="text-yellow-700 text-sm mt-2 font-medium">
                    💡 Clicked: <span className="font-bold">{selectedTimeframe.toUpperCase()}</span> • 
                    Showing: <span className="font-bold">{actualInterval.toUpperCase()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900 mb-1">❌ Chart Error</h4>
                  <p className="text-red-700">{error}</p>
                  {!isFutureDate() && (
                    <button
                      onClick={() => fetchChartData(selectedTimeframe)}
                      className="mt-3 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-bold shadow-md"
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-indigo-600 mx-auto mb-4"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <p className="text-gray-700 font-semibold">Loading {selectedTimeframe.toUpperCase()} chart...</p>
              </div>
            </div>
          )}

          {/* CHART */}
          {!loading && !error && chartData.length > 0 && (
            <>
              {/* STATS */}
              {stats && (
                <div className="mb-5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-gray-600 text-xs mb-1 font-medium">Open</div>
                      <div className="font-bold text-gray-900 text-lg">₹{stats.open?.toFixed(2)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                      <div className="text-green-700 text-xs mb-1 font-medium">High</div>
                      <div className="font-bold text-green-700 text-lg">₹{stats.high?.toFixed(2)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-3 border border-red-200">
                      <div className="text-red-700 text-xs mb-1 font-medium">Low</div>
                      <div className="font-bold text-red-700 text-lg">₹{stats.low?.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-gray-600 text-xs mb-1 font-medium">Close</div>
                      <div className="font-bold text-gray-900 text-lg">₹{stats.close?.toFixed(2)}</div>
                    </div>
                    <div className={`rounded-lg p-3 border-2 ${
                      parseFloat(stats.changeValue) >= 0 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
                        : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
                    }`}>
                      <div className={`text-xs mb-1 font-medium ${
                        parseFloat(stats.changeValue) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        Change
                      </div>
                      <div className={`font-bold text-lg ${
                        parseFloat(stats.changeValue) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {stats.change}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CANDLESTICK CHART */}
              <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5 overflow-x-auto shadow-lg relative">
                <svg 
                  ref={svgRef}
                  width={chartWidth} 
                  height={chartHeight} 
                  className="mx-auto"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <rect width={chartWidth} height={chartHeight} fill="#fafafa" rx="8" />

                  {/* Y-axis grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + ratio * priceChartHeight;
                    const price = yMax - ratio * (yMax - yMin);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#e0e0e0"
                          strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                        <text
                          x={chartWidth - padding.right + 10}
                          y={y + 4}
                          fontSize="11"
                          fill="#666"
                          fontWeight="600"
                        >
                          ₹{price.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Entry line */}
                  <line
                    x1={padding.left}
                    y1={priceToY(trade.entry_price)}
                    x2={chartWidth - padding.right}
                    y2={priceToY(trade.entry_price)}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    opacity="0.8"
                  />
                  <text
                    x={padding.left + 10}
                    y={priceToY(trade.entry_price) - 8}
                    fontSize="13"
                    fill="#3b82f6"
                    fontWeight="bold"
                  >
                    📈 Entry: ₹{trade.entry_price.toFixed(2)}
                  </text>

                  {/* Exit line */}
                  {trade.exit_price && (
                    <>
                      <line
                        x1={padding.left}
                        y1={priceToY(trade.exit_price)}
                        x2={chartWidth - padding.right}
                        y2={priceToY(trade.exit_price)}
                        stroke="#f97316"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                        opacity="0.8"
                      />
                      <text
                        x={padding.left + 10}
                        y={priceToY(trade.exit_price) + 20}
                        fontSize="13"
                        fill="#f97316"
                        fontWeight="bold"
                      >
                        📉 Exit: ₹{trade.exit_price.toFixed(2)}
                      </text>
                    </>
                  )}

                  {/* Candlesticks */}
                  {chartData.map((candle, i) => {
                    const x = padding.left + (i * innerWidth) / chartData.length + (innerWidth / chartData.length - candleWidth) / 2;
                    const isGreen = candle.close >= candle.open;
                    const color = isGreen ? '#10b981' : '#ef4444';

                    const yHigh = priceToY(candle.high);
                    const yLow = priceToY(candle.low);
                    const yOpen = priceToY(candle.open);
                    const yClose = priceToY(candle.close);
                    const yTop = Math.min(yOpen, yClose);
                    const yBottom = Math.max(yOpen, yClose);
                    const bodyHeight = Math.max(2, Math.abs(yBottom - yTop));

                    return (
                      <g key={i}>
                        <line
                          x1={x + candleWidth / 2}
                          y1={yHigh}
                          x2={x + candleWidth / 2}
                          y2={yLow}
                          stroke={color}
                          strokeWidth="2"
                        />
                        <rect
                          x={x}
                          y={yTop}
                          width={candleWidth}
                          height={bodyHeight}
                          fill={color}
                          stroke={color}
                          strokeWidth="1"
                          opacity="0.9"
                        />
                      </g>
                    );
                  })}

                  {/* Volume bars */}
                  {showVolume && chartData.map((candle, i) => {
                    const x = padding.left + (i * innerWidth) / chartData.length + (innerWidth / chartData.length - candleWidth) / 2;
                    const volHeight = volumeToHeight(candle.volume || 0);
                    const volY = chartHeight - padding.bottom - volHeight;
                    const isGreen = candle.close >= candle.open;
                    const color = isGreen ? '#10b98150' : '#ef444450';

                    return (
                      <rect
                        key={`vol-${i}`}
                        x={x}
                        y={volY}
                        width={candleWidth}
                        height={volHeight}
                        fill={color}
                      />
                    );
                  })}

                  {/* X-axis labels */}
                  {chartData.map((candle, i) => {
                    if (i % Math.ceil(chartData.length / 10) === 0) {
                      const x = padding.left + (i * innerWidth) / chartData.length;
                      const label = actualInterval === '1d' ? formatDate(candle.time) : formatTime(candle.time);
                      return (
                        <text
                          key={`label-${i}`}
                          x={x}
                          y={chartHeight - padding.bottom + 25}
                          fontSize="11"
                          fill="#666"
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {label}
                        </text>
                      );
                    }
                    return null;
                  })}
                </svg>

                {/* Tooltip */}
                {tooltip.visible && tooltip.candle && (
                  <div
                    className="absolute bg-gray-900 text-white rounded-lg p-3 shadow-2xl text-xs pointer-events-none z-10 border-2 border-gray-700"
                    style={{
                      left: `${tooltip.x + 15}px`,
                      top: `${tooltip.y - 80}px`,
                      maxWidth: '200px'
                    }}
                  >
                    <div className="font-bold text-yellow-400 mb-2 border-b border-gray-700 pb-1">
                      {formatFullDateTime(tooltip.candle.time)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">Open:</span>
                        <span className="font-bold">₹{tooltip.candle.open.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-green-400">High:</span>
                        <span className="font-bold text-green-400">₹{tooltip.candle.high.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-red-400">Low:</span>
                        <span className="font-bold text-red-400">₹{tooltip.candle.low.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">Close:</span>
                        <span className="font-bold">₹{tooltip.candle.close.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-gray-700 pt-1">
                        <span className="text-blue-400">Volume:</span>
                        <span className="font-bold text-blue-400">
                          {tooltip.candle.volume?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHART INFO */}
              <div className="mt-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-indigo-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Chart Info:
                  </span>
                  <span className="bg-white px-3 py-1 rounded-lg font-semibold text-gray-700 shadow-sm">
                    {chartData.length} Candles
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">
                    Timeframe: <span className="font-bold text-indigo-700">{actualInterval.toUpperCase()}</span>
                  </span>
                  {actualInterval !== selectedTimeframe && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
                        Fallback from {selectedTimeframe.toUpperCase()}
                      </span>
                    </>
                  )}
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">
                    Candle Width: <span className="font-bold text-purple-700">{candleWidth.toFixed(1)}px</span>
                  </span>
                </div>
              </div>
            </>
          )}

          {/* NO DATA */}
          {!loading && !error && chartData.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">No chart data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}