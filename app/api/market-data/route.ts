// app/api/market-data/route.ts
// FINAL FIX: Case-insensitive intervals + Complete fallback chain

import { NextResponse } from 'next/server';

// Symbol cache
const symbolCache = new Map<string, string>();

// Yahoo Finance Search
async function searchYahooSymbol(companyName: string): Promise<string | null> {
  const cacheKey = companyName.toUpperCase().trim();
  if (symbolCache.has(cacheKey)) {
    console.log(`   💾 Cache hit: ${symbolCache.get(cacheKey)}`);
    return symbolCache.get(cacheKey)!;
  }

  try {
    const cleanName = companyName
      .replace(/\s+LTD\.?$/i, '')
      .replace(/\s+LIMITED$/i, '')
      .replace(/\s+CORPORATION$/i, '')
      .trim();

    console.log(`   🔍 Searching Yahoo for: "${cleanName}"`);

    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanName)}&quotesCount=5&newsCount=0&region=IN`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`   ⚠️ Search failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.quotes || data.quotes.length === 0) {
      console.log(`   ⚠️ No results found`);
      return null;
    }

    const bestMatch = data.quotes[0];
    const symbol = bestMatch.symbol;

    console.log(`   ✅ Found: ${symbol} (${bestMatch.longname || bestMatch.shortname})`);

    symbolCache.set(cacheKey, symbol);
    return symbol;
  } catch (error: any) {
    console.log(`   ❌ Search error: ${error.message}`);
    return null;
  }
}

// Manual symbol mapping
const MANUAL_SYMBOLS: { [key: string]: string } = {
  'CANARA BANK': 'CANBK.NS',
  'SBI': 'SBIN.NS',
  'HDFC BANK': 'HDFCBANK.NS',
  'ICICI BANK': 'ICICIBANK.NS',
  'AXIS BANK': 'AXISBANK.NS',
  'KOTAK BANK': 'KOTAKBANK.NS',
  'TCS': 'TCS.NS',
  'INFOSYS': 'INFY.NS',
  'WIPRO': 'WIPRO.NS',
  'HCL TECH': 'HCLTECH.NS',
  'TATA MOTORS': 'TATAMOTORS.NS',
  'MARUTI': 'MARUTI.NS',
  'MAHINDRA': 'M&M.NS',
  'RELIANCE': 'RELIANCE.NS',
  'ONGC': 'ONGC.NS',
  'NTPC': 'NTPC.NS',
  'POWER GRID': 'POWERGRID.NS',
  'TORRENT POWER': 'TORNTPOWER.NS',
  'COCHIN SHIPYARD': 'COCHINSHIP.NS',
  'MAZAGON DOCK': 'MAZDOCK.NS',
  'GARDEN REACH': 'GRSE.NS',
  'HAL': 'HAL.NS',
};

// Get Yahoo symbol
async function getYahooSymbol(symbol: string): Promise<string[]> {
  const cleaned = symbol.toUpperCase().trim();

  console.log(`\n🔍 Symbol Lookup: "${symbol}"`);

  if (cleaned.includes('NIFTY') && (cleaned.includes('CALL') || cleaned.includes('PUT') || cleaned.includes('CE') || cleaned.includes('PE'))) {
    console.log(`   ✅ Detected: NIFTY Option`);
    return ['^NSEI'];
  }
  if (cleaned.includes('BANKNIFTY') || cleaned.includes('BANK NIFTY')) {
    console.log(`   ✅ Detected: Bank NIFTY`);
    return ['^NSEBANK'];
  }

  for (const [key, value] of Object.entries(MANUAL_SYMBOLS)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      console.log(`   ✅ Manual match: ${value}`);
      return [value];
    }
  }

  const searchResult = await searchYahooSymbol(symbol);
  if (searchResult) {
    return [searchResult];
  }

  const simplifiedSymbol = cleaned
    .replace(/\s+LTD\.?$/i, '')
    .replace(/\s+LIMITED$/i, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 20);

  console.log(`   ⚠️ Using fallback: ${simplifiedSymbol}.NS`);

  return [`${simplifiedSymbol}.NS`, `${simplifiedSymbol}.BO`];
}

// Check if date is in future
function isFutureDate(dateStr: string): boolean {
  const tradeDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  tradeDate.setHours(0, 0, 0, 0);
  return tradeDate > today;
}

// Convert IST to UTC
function getMarketSessionUTC(dateStr: string) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const startIST = new Date(`${year}-${month}-${day}T09:15:00+05:30`);
  const endIST = new Date(`${year}-${month}-${day}T15:30:00+05:30`);

  return {
    start: Math.floor(startIST.getTime() / 1000),
    end: Math.floor(endIST.getTime() / 1000)
  };
}

// Get expanded date range for daily data
function getExpandedRange(dateStr: string) {
  const date = new Date(dateStr);
  
  const start = new Date(date);
  start.setDate(start.getDate() - 7);
  
  const end = new Date(date);
  end.setDate(end.getDate() + 7);
  
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000)
  };
}

// Yahoo Finance intervals
const YAHOO_INTERVALS: { [key: string]: string } = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '1d': '1d'
};

// Fetch from Yahoo Finance
async function fetchYahoo(
  symbols: string[],
  interval: string,
  period1: number,
  period2: number,
  dateStr: string
): Promise<any> {
  // ⭐ CRITICAL FIX: Normalize interval to lowercase
  const normalizedInterval = interval.toLowerCase();
  
  // Complete fallback chain
  let fallbacks: string[] = [];
  
  if (normalizedInterval === '5m' || normalizedInterval === '15m') {
    fallbacks = [normalizedInterval, '1h', '1d'];
  } else if (normalizedInterval === '1h') {
    fallbacks = [normalizedInterval, '1d'];
  } else if (normalizedInterval === '1d') {
    fallbacks = [normalizedInterval];
  } else {
    // Default fallback for unknown intervals
    fallbacks = [normalizedInterval, '1h', '1d'];
  }

  console.log(`   📋 Fallback chain: ${fallbacks.join(' → ')}`);

  let lastError: any = null;

  for (const symbol of symbols) {
    console.log(`\n📊 Trying: ${symbol}`);

    for (let i = 0; i < fallbacks.length; i++) {
      const tryInterval = fallbacks[i];
      
      try {
        const yahooInterval = YAHOO_INTERVALS[tryInterval] || tryInterval;
        
        let start = period1;
        let end = period2;
        
        if (tryInterval === '1d') {
          const expanded = getExpandedRange(dateStr);
          start = expanded.start;
          end = expanded.end;
          console.log(`   → [${tryInterval}] (expanded range: ±7 days)`);
        } else {
          console.log(`   → [${tryInterval}]`);
        }
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=${yahooInterval}&includePrePost=false`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          console.log(`   ❌ Failed [${tryInterval}]: ${lastError.message}`);
          continue;
        }

        const data = await response.json();

        if (!data?.chart?.result?.[0]?.timestamp || data.chart.result[0].timestamp.length === 0) {
          lastError = new Error('No data in response');
          console.log(`   ❌ Failed [${tryInterval}]: No data`);
          continue;
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        const candles = timestamps.map((ts: number, i: number) => ({
          time: ts * 1000,
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i]
        })).filter((c: any) => c.open !== null && c.close !== null);

        if (candles.length === 0) {
          lastError = new Error('No valid candles');
          console.log(`   ❌ Failed [${tryInterval}]: No valid candles`);
          continue;
        }

        console.log(`   ✅ Success [${tryInterval}]: ${candles.length} candles`);

        let warning = null;
        if (tryInterval !== normalizedInterval) {
          if (normalizedInterval === '1h' && tryInterval === '1d') {
            warning = `Hourly data not available for this date. Showing daily data instead.`;
          } else if ((normalizedInterval === '5m' || normalizedInterval === '15m') && tryInterval === '1h') {
            warning = `${normalizedInterval} data not available for this date. Showing 1-hour data instead.`;
          } else if ((normalizedInterval === '5m' || normalizedInterval === '15m') && tryInterval === '1d') {
            warning = `${normalizedInterval} data not available for this date. Showing daily data instead.`;
          } else {
            warning = `${normalizedInterval} data not available. Showing ${tryInterval} data instead.`;
          }
        }

        return {
          candles,
          interval: tryInterval,
          symbol: symbol,
          warning
        };

      } catch (error: any) {
        lastError = error;
        console.log(`   ❌ Failed [${tryInterval}]: ${error.message}`);
        continue;
      }
    }
  }

  // Better error message
  throw new Error(`No data available for this date. The stock may not have traded on ${dateStr}, or data is unavailable. Try a different date.`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, timeframe, entry_time } = body;

    console.log('\n📊 Chart Request:');
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Date: ${entry_time.split('T')[0]}`);
    console.log(`   Timeframe: ${timeframe || '5m'} (original)`);

    const interval = timeframe || '5m';
    const dateStr = entry_time.split('T')[0];

    // Check for future dates
    if (isFutureDate(dateStr)) {
      console.log('   ⚠️ Future date detected');
      return NextResponse.json({
        error: 'This trade is dated in the future. Chart data is only available for past dates. Please check the trade date.',
        isFutureDate: true
      }, { status: 400 });
    }

    // Get Yahoo Finance symbols
    const yahooSymbols = await getYahooSymbol(symbol);

    // Get market session in UTC
    const { start, end } = getMarketSessionUTC(dateStr);

    // Fetch data
    const result = await fetchYahoo(yahooSymbols, interval, start, end, dateStr);

    // Calculate stats
    const candles = result.candles;
    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;

    const stats = {
      open: firstCandle.open,
      high: Math.max(...candles.map((c: any) => c.high)),
      low: Math.min(...candles.map((c: any) => c.low)),
      close: lastCandle.close,
      volume: candles.reduce((sum: number, c: any) => sum + (c.volume || 0), 0),
      change: change.toFixed(2) + '%',
      changeValue: (lastCandle.close - firstCandle.open).toFixed(2)
    };

    return NextResponse.json({
      success: true,
      chartData: candles,
      stats,
      actualInterval: result.interval,
      requestedInterval: interval.toLowerCase(),
      symbolUsed: result.symbol,
      warning: result.warning
    });

  } catch (error: any) {
    console.error('\n❌ API Error:', error.message);
    return NextResponse.json({
      error: error.message || 'Failed to fetch market data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Market Data API - Indian Market Ready',
    features: [
      'Automatic Yahoo Finance symbol search',
      'Complete fallback: 5m→1h→1d, 1h→1d',
      'Case-insensitive interval handling',
      'Expanded date range for daily data',
      'Future date detection',
      'Symbol caching for performance'
    ],
    cacheSize: symbolCache.size
  });
}