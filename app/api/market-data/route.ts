// File: app/api/market-data/route.ts
// ✅ FINAL VERSION with Smart Fallback (5m→1h→1d)

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

// Clean symbol
function cleanSymbol(symbol: string): string {
  return symbol
    .toUpperCase()
    .trim()
    .replace(/ LTD| LIMITED| COMPANY| CO| CORP| PVT| PRIVATE| INC| PLC| INDUSTRIES| INDIA| SHIPYARD| ENTERPRISES/g, '')
    .replace(/\s+/g, '');
}

// Parse options to get underlying
function parseOption(symbol: string): string {
  const match = symbol.match(/^([A-Z]+)/i);
  return match ? match[1] : symbol;
}

// Map to Yahoo symbol
function mapToYahoo(symbol: string): string {
  const underlying = parseOption(symbol);
  const cleaned = cleanSymbol(underlying);
  
  // Index symbols
  const indices: { [key: string]: string } = {
    'NIFTY': '^NSEI',
    'NIFTY50': '^NSEI',
    'BANKNIFTY': '^NSEBANK',
    'SENSEX': '^BSESN',
  };
  
  if (indices[cleaned]) return indices[cleaned];
  if (cleaned.endsWith('.NS') || cleaned.endsWith('.BO')) return cleaned;
  if (cleaned.startsWith('^')) return cleaned;
  
  return `${cleaned}.NS`;
}

// Yahoo interval mapping
function getInterval(tf: string): string {
  const map: { [key: string]: string } = {
    '5min': '5m',
    '5m': '5m',
    '15min': '15m',
    '15m': '15m',
    '1h': '1h',
    '1H': '1h',
    '1d': '1d',
    '1D': '1d',
  };
  return map[tf] || '5m';
}

// Calculate market session (09:15-15:30 IST)
function getMarketSession(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // IST = UTC + 5:30
  // 09:15 IST = 03:45 UTC
  const start = new Date(Date.UTC(year, month - 1, day, 3, 45, 0));
  
  // 15:30 IST = 10:00 UTC
  const end = new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
  
  return { start, end };
}

// ✅ Fetch from Yahoo with SMART FALLBACK
async function fetchYahoo(
  symbol: string,
  interval: string,
  start: Date,
  end: Date
): Promise<{ chartData: ChartData[]; usedInterval: string }> {
  const yahooSymbol = mapToYahoo(symbol);
  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(end.getTime() / 1000);
  
  // ✅ Smart fallback: 5m/15m → 1h → 1d
  const fallbacks = interval === '1d' ? ['1d'] : 
                    interval === '1h' ? ['1h', '1d'] : 
                    [interval, '1h', '1d'];
  
  let lastError: any = null;
  
  for (const currentInterval of fallbacks) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${currentInterval}&period1=${period1}&period2=${period2}`;
      
      console.log(`📊 Trying: ${yahooSymbol} [${currentInterval}]`);
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!response.ok) {
        console.log(`❌ Failed [${currentInterval}]: HTTP ${response.status}`);
        lastError = new Error(`HTTP ${response.status}`);
        continue; // Try next interval
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result?.timestamp || result.timestamp.length === 0) {
        console.log(`❌ No data [${currentInterval}]`);
        lastError = new Error('No data');
        continue; // Try next interval
      }
      
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      
      const chartData = timestamps
        .map((ts: number, i: number) => ({
          time: new Date(ts * 1000).toISOString(),
          open: quote.open?.[i] || 0,
          high: quote.high?.[i] || 0,
          low: quote.low?.[i] || 0,
          close: quote.close?.[i] || 0,
          volume: quote.volume?.[i] || 0,
        }))
        .filter((d: ChartData) => d.open > 0 && d.close > 0);

      if (chartData.length === 0) {
        console.log(`❌ No valid candles [${currentInterval}]`);
        continue; // Try next interval
      }

      console.log(`✅ Success [${currentInterval}]: ${chartData.length} candles`);
      return { chartData, usedInterval: currentInterval };
      
    } catch (err: any) {
      console.log(`❌ Error [${currentInterval}]:`, err.message);
      lastError = err;
      continue; // Try next interval
    }
  }
  
  // All intervals failed
  throw new Error(`No data available. Tried: ${fallbacks.join(', ')}. Last error: ${lastError?.message || 'Unknown'}`);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, timeframe = '5m', entry_time } = body;

    if (!symbol || !entry_time) {
      return NextResponse.json({ 
        error: 'Missing required fields: symbol and entry_time' 
      }, { status: 400 });
    }

    // Extract trade date (YYYY-MM-DD)
    const tradeDate = entry_time.split('T')[0];
    
    console.log(`\n📊 Chart Request:`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Date: ${tradeDate}`);
    console.log(`   Timeframe: ${timeframe}`);

    // Get full market session
    const { start, end } = getMarketSession(tradeDate);
    const interval = getInterval(timeframe);
    
    // ✅ Fetch with smart fallback
    const { chartData, usedInterval } = await fetchYahoo(symbol, interval, start, end);

    if (chartData.length === 0) {
      return NextResponse.json({
        error: 'No chart data available',
        message: `No data for ${symbol} on ${tradeDate}`,
      }, { status: 404 });
    }

    // Calculate stats
    const prices = chartData.map(d => d.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const open = chartData[0].open;
    const close = chartData[chartData.length - 1].close;
    const change = ((close - open) / open * 100).toFixed(2);

    // ✅ Warning if interval changed
    let warning = undefined;
    if (usedInterval !== interval) {
      const intervalNames: { [key: string]: string } = {
        '5m': '5-minute',
        '15m': '15-minute',
        '1h': '1-hour',
        '1d': 'daily'
      };
      warning = `${intervalNames[interval] || interval} data not available for this date. Showing ${intervalNames[usedInterval] || usedInterval} data instead.`;
      console.log(`⚠️  ${warning}`);
    }

    return NextResponse.json({
      success: true,
      symbol,
      yahoo_symbol: mapToYahoo(symbol),
      trade_date: tradeDate,
      timeframe: usedInterval, // ✅ Return actual interval used
      requested_timeframe: timeframe,
      interval,
      chartData,
      stats: {
        open,
        high,
        low,
        close,
        change: parseFloat(change),
        candles: chartData.length,
      },
      warning, // ✅ Show warning if fallback used
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch chart'
    }, { status: 500 });
  }
}