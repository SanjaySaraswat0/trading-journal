// lib/market-data/twelve-data.ts

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  volume: number;
  timestamp: string;
}

interface HistoricalData {
  symbol: string;
  data: {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com';

// Cache to avoid hitting API limits
const cache = new Map<string, { data: any; expires: number }>();

function getCacheKey(endpoint: string, params: Record<string, string>): string {
  return `${endpoint}-${JSON.stringify(params)}`;
}

function getCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMinutes: number = 5): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMinutes * 60 * 1000,
  });
}

// Get Real-time Quote
export async function getQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const cacheKey = getCacheKey('quote', { symbol });
    const cached = getCache(cacheKey);
    if (cached) {
      console.log('📊 Using cached quote for', symbol);
      return cached;
    }

    const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Twelve Data API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code === 429) {
      console.warn('⚠️ API rate limit reached');
      return null;
    }

    if (data.status === 'error') {
      console.error('Twelve Data error:', data.message);
      return null;
    }

    const quote: QuoteData = {
      symbol: data.symbol,
      price: parseFloat(data.close),
      change: parseFloat(data.change || 0),
      change_percent: parseFloat(data.percent_change || 0),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      open: parseFloat(data.open),
      previous_close: parseFloat(data.previous_close),
      volume: parseInt(data.volume || 0),
      timestamp: data.datetime || new Date().toISOString(),
    };

    // Cache for 5 minutes
    setCache(cacheKey, quote, 5);

    return quote;
  } catch (error) {
    console.error('Error fetching quote:', error);
    return null;
  }
}

// Get Historical Data
export async function getHistoricalData(
  symbol: string,
  interval: '1day' | '1week' | '1month' = '1day',
  outputsize: number = 30
): Promise<HistoricalData | null> {
  try {
    const cacheKey = getCacheKey('historical', { symbol, interval, outputsize: outputsize.toString() });
    const cached = getCache(cacheKey);
    if (cached) {
      console.log('📊 Using cached historical data for', symbol);
      return cached;
    }

    const url = `${BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Twelve Data API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code === 429) {
      console.warn('⚠️ API rate limit reached');
      return null;
    }

    if (data.status === 'error') {
      console.error('Twelve Data error:', data.message);
      return null;
    }

    const historical: HistoricalData = {
      symbol: data.meta.symbol,
      data: data.values.map((v: any) => ({
        datetime: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseInt(v.volume || 0),
      })),
    };

    // Cache for 1 hour
    setCache(cacheKey, historical, 60);

    return historical;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return null;
  }
}

// Get Multiple Quotes (Batch)
export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
  const quotes = new Map<string, QuoteData>();
  
  // Fetch in parallel but respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(symbol => getQuote(symbol))
    );
    
    results.forEach((quote, index) => {
      if (quote) {
        quotes.set(batch[index], quote);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return quotes;
}

// Calculate Unrealized P&L for Open Trades
export async function calculateUnrealizedPnL(trades: any[]): Promise<Map<string, number>> {
  const openTrades = trades.filter(t => t.status === 'open');
  const symbols = [...new Set(openTrades.map(t => t.symbol))];
  
  const quotes = await getMultipleQuotes(symbols);
  const pnlMap = new Map<string, number>();
  
  openTrades.forEach(trade => {
    const quote = quotes.get(trade.symbol);
    if (!quote) return;
    
    const currentPrice = quote.price;
    const entryPrice = trade.entry_price;
    const quantity = trade.quantity;
    
    let pnl = 0;
    if (trade.trade_type === 'long') {
      pnl = (currentPrice - entryPrice) * quantity;
    } else {
      pnl = (entryPrice - currentPrice) * quantity;
    }
    
    pnlMap.set(trade.id, pnl);
  });
  
  return pnlMap;
}

// Mock Data Fallback (for testing without API key)
export function getMockQuote(symbol: string): QuoteData {
  const basePrice = 100 + Math.random() * 400;
  const change = (Math.random() - 0.5) * 10;
  
  return {
    symbol,
    price: basePrice,
    change,
    change_percent: (change / basePrice) * 100,
    high: basePrice + Math.random() * 5,
    low: basePrice - Math.random() * 5,
    open: basePrice + (Math.random() - 0.5) * 3,
    previous_close: basePrice - change,
    volume: Math.floor(Math.random() * 1000000),
    timestamp: new Date().toISOString(),
  };
}

export function getMockHistoricalData(symbol: string, days: number = 30): HistoricalData {
  const data = [];
  let price = 100 + Math.random() * 400;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const open = price;
    const change = (Math.random() - 0.5) * 5;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    
    data.push({
      datetime: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000),
    });
    
    price = close;
  }
  
  return { symbol, data };
}