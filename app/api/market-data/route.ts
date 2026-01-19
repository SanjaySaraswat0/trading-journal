// File: app/api/market-data/route.ts
// ✅ FIXED: NIFTY/BANKNIFTY Support + Better Symbol Mapping

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ✅ FIXED: Yahoo Finance symbol mapper with NIFTY support
function mapSymbolToYahoo(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // ✅ Indian Indices - Special handling
  const indexMap: { [key: string]: string } = {
    'NIFTY': '^NSEI',
    'NIFTY50': '^NSEI',
    'NIFTY.NS': '^NSEI',
    'BANKNIFTY': '^NSEBANK',
    'BANKNIFTY.NS': '^NSEBANK',
    'SENSEX': '^BSESN',
    'SENSEX.BO': '^BSESN',
    'NIFTYNXT50': '^NSEI',
    'FINNIFTY': '^CNXFIN',
  };
  
  // Check if it's an index
  if (indexMap[upperSymbol]) {
    return indexMap[upperSymbol];
  }
  
  // If already has .NS or .BO suffix, return as-is
  if (upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO')) {
    return upperSymbol;
  }
  
  // If it's a forex pair (ends with =X)
  if (upperSymbol.endsWith('=X')) {
    return upperSymbol;
  }
  
  // If it's crypto (ends with USD, BTC, ETH, etc.)
  if (upperSymbol.endsWith('USD') || 
      upperSymbol.includes('BTC') || 
      upperSymbol.includes('ETH')) {
    return upperSymbol;
  }
  
  // If it starts with ^ (index), return as-is
  if (upperSymbol.startsWith('^')) {
    return upperSymbol;
  }
  
  // Default: assume NSE stock, add .NS
  return `${upperSymbol}.NS`;
}

// Timeframe to interval mapping
function getYahooInterval(timeframe: string): string {
  const intervalMap: { [key: string]: string } = {
    '1min': '1m',
    '5min': '5m',
    '15min': '15m',
    '1h': '1h',
    '4h': '1h',
    '1d': '1d',
  };
  return intervalMap[timeframe] || '1d';
}

// Calculate technical analysis
function analyzeTechnicalData(data: ChartData[]) {
  if (data.length < 5) return null;

  const recentClose = data[data.length - 1].close;
  const startClose = data[0].close;
  const trend = recentClose > startClose ? 'bullish' : 'bearish';

  const prices = data.map((d: ChartData) => d.close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const priceRange = ((maxPrice - minPrice) / avgPrice) * 100;
  
  let volatility = 'low';
  if (priceRange > 5) volatility = 'high';
  else if (priceRange > 2) volatility = 'medium';

  const highs = data.map((d: ChartData) => d.high);
  const lows = data.map((d: ChartData) => d.low);
  
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const sortedLows = [...lows].sort((a, b) => a - b);
  
  const resistance_levels = sortedHighs.slice(0, 3);
  const support_levels = sortedLows.slice(0, 3);

  const volumes = data.map((d: ChartData) => d.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recentVolume = volumes[volumes.length - 1];
  
  const volume_trend = recentVolume > avgVolume * 1.2 ? 'High volume' : 
                       recentVolume < avgVolume * 0.8 ? 'Low volume' : 'Normal volume';

  const priceChange = ((recentClose - startClose) / startClose * 100).toFixed(2);
  const market_context = `Price moved ${priceChange}% during this period. ${
    trend === 'bullish' ? 'Uptrend observed' : 'Downtrend observed'
  } with ${volatility} volatility.`;

  return {
    trend,
    volatility,
    support_levels,
    resistance_levels,
    volume_trend,
    market_context,
    price_change_percent: parseFloat(priceChange)
  };
}

// ✅ FIXED: Fetch from Yahoo Finance with better error handling
async function fetchYahooFinanceData(
  symbol: string,
  interval: string,
  range: string = '1mo'
): Promise<ChartData[]> {
  try {
    const yahooSymbol = mapSymbolToYahoo(symbol);
    
    console.log(`🔍 Mapping: ${symbol} → ${yahooSymbol}`);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`❌ Yahoo Finance HTTP ${response.status} for ${yahooSymbol}`);
      throw new Error(`Failed to fetch data from Yahoo Finance (HTTP ${response.status})`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      console.error('❌ No chart result in response:', JSON.stringify(data).substring(0, 200));
      throw new Error(`No data available for symbol: ${yahooSymbol}`);
    }

    const result = data.chart.result[0];
    
    if (!result.timestamp || result.timestamp.length === 0) {
      throw new Error(`No timestamp data for ${yahooSymbol}`);
    }
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];
    
    if (!quote) {
      throw new Error(`No quote data for ${yahooSymbol}`);
    }
    
    const chartData: ChartData[] = timestamps
      .map((timestamp: number, idx: number) => ({
        time: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: quote.open?.[idx] || 0,
        high: quote.high?.[idx] || 0,
        low: quote.low?.[idx] || 0,
        close: quote.close?.[idx] || 0,
        volume: quote.volume?.[idx] || 0,
      }))
      .filter((d: ChartData) => d.open > 0 && d.close > 0); // Remove invalid data

    console.log(`✅ Fetched ${chartData.length} candles for ${yahooSymbol}`);
    
    return chartData;
  } catch (error: any) {
    console.error('Yahoo Finance API error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, timeframe = '1d', start, end } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    console.log(`📊 Fetching market data for ${symbol} (${timeframe})`);

    // Calculate date range
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine range parameter for Yahoo
    let range = '1mo';
    if (daysDiff <= 5) range = '5d';
    else if (daysDiff <= 30) range = '1mo';
    else if (daysDiff <= 180) range = '6mo';
    else range = '1y';

    const interval = getYahooInterval(timeframe);
    
    // Fetch chart data
    const chartData = await fetchYahooFinanceData(symbol, interval, range);

    if (chartData.length === 0) {
      return NextResponse.json({
        error: 'No data available for this symbol',
        suggestion: `Try adding .NS for NSE stocks (e.g., RELIANCE.NS) or .BO for BSE stocks. For NIFTY, it will auto-convert to ^NSEI.`
      }, { status: 404 });
    }

    // Filter data to trade period
    const filteredData = chartData.filter((d: ChartData) => {
      const dataDate = new Date(d.time);
      return dataDate >= startDate && dataDate <= endDate;
    });

    // Perform technical analysis
    const analysis = analyzeTechnicalData(filteredData.length > 0 ? filteredData : chartData);

    console.log(`✅ Successfully fetched ${filteredData.length} candles`);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      chartData: filteredData.length > 0 ? filteredData : chartData.slice(-30),
      analysis,
      metadata: {
        total_candles: chartData.length,
        filtered_candles: filteredData.length,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        yahoo_symbol: mapSymbolToYahoo(symbol),
      }
    });

  } catch (error: any) {
    console.error('❌ Market data API error:', error);
    
    return NextResponse.json({
      error: error.message || 'Failed to fetch market data',
      suggestion: 'For Indian stocks, try adding .NS (e.g., TCS.NS for NSE) or .BO for BSE. NIFTY and BANKNIFTY are auto-converted to Yahoo indices.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe') || '1d';

  if (!symbol) {
    return NextResponse.json({
      error: 'Missing symbol parameter',
      example: '/api/market-data?symbol=NIFTY&timeframe=1d'
    }, { status: 400 });
  }

  try {
    const interval = getYahooInterval(timeframe);
    const chartData = await fetchYahooFinanceData(symbol, interval, '1mo');
    
    return NextResponse.json({
      success: true,
      symbol,
      yahoo_symbol: mapSymbolToYahoo(symbol),
      data_points: chartData.length,
      latest_price: chartData[chartData.length - 1]?.close || 0,
      chartData: chartData.slice(-10),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      suggestion: 'Try adding .NS for NSE stocks or .BO for BSE stocks. NIFTY will auto-convert to ^NSEI.'
    }, { status: 500 });
  }
}