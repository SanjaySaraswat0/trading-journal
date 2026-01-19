// File: app/api/trades/import/route.ts
// ✅ CORRECT: Named exports POST and GET

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

interface ParsedTrade {
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  entry_time: string;
  exit_time?: string;
  pnl?: number;
  asset_type?: string;
  setup_type?: string;
  stop_loss?: number;
  target_price?: number;
}

// Column mapping for different brokers
const BROKER_MAPPINGS = {
  zerodha: {
    symbol: ['symbol', 'tradingsymbol', 'instrument'],
    trade_type: ['trade_type', 'transaction_type', 'buy_sell'],
    entry_price: ['buy_price', 'entry_price', 'price'],
    exit_price: ['sell_price', 'exit_price'],
    quantity: ['quantity', 'qty', 'volume'],
    entry_time: ['buy_date', 'entry_date', 'trade_date', 'date'],
    exit_time: ['sell_date', 'exit_date'],
    pnl: ['pnl', 'profit_loss', 'net_pnl'],
  },
  upstox: {
    symbol: ['symbol', 'scrip'],
    trade_type: ['side', 'type'],
    entry_price: ['avg_price', 'price'],
    exit_price: ['exit_avg_price', 'sell_price'],
    quantity: ['qty', 'quantity'],
    entry_time: ['date', 'trade_date'],
    pnl: ['realized_pnl', 'pnl'],
  },
  angel_one: {
    symbol: ['symbol_name', 'symbol'],
    trade_type: ['order_type', 'side'],
    entry_price: ['buy_avg_price', 'price'],
    exit_price: ['sell_avg_price'],
    quantity: ['net_qty', 'quantity'],
    entry_time: ['trade_date', 'date'],
    pnl: ['net_pnl', 'pnl'],
  },
  generic: {
    symbol: ['symbol', 'stock', 'ticker', 'instrument'],
    trade_type: ['type', 'side', 'trade_type', 'action'],
    entry_price: ['entry', 'buy_price', 'entry_price', 'price'],
    exit_price: ['exit', 'sell_price', 'exit_price'],
    quantity: ['qty', 'quantity', 'shares', 'volume'],
    entry_time: ['entry_date', 'date', 'time', 'entry_time'],
    exit_time: ['exit_date', 'exit_time', 'sell_date'],
    pnl: ['pnl', 'profit', 'profit_loss', 'net'],
  },
};

// Auto-detect broker format
function detectBrokerFormat(headers: string[]): string {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  if (lowerHeaders.includes('tradingsymbol') || lowerHeaders.includes('order_id')) {
    return 'zerodha';
  }
  if (lowerHeaders.includes('scrip') || lowerHeaders.includes('upstox')) {
    return 'upstox';
  }
  if (lowerHeaders.includes('symbol_name') || lowerHeaders.includes('angelone')) {
    return 'angel_one';
  }
  return 'generic';
}

// Find column index by multiple possible names
function findColumn(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const name of possibleNames) {
    const index = lowerHeaders.indexOf(name.toLowerCase());
    if (index !== -1) return index;
  }
  
  return -1;
}

// Parse CSV row to trade object
function parseRowToTrade(
  row: any[],
  headers: string[],
  mapping: any
): ParsedTrade | null {
  try {
    const symbolIdx = findColumn(headers, mapping.symbol);
    const typeIdx = findColumn(headers, mapping.trade_type);
    const entryPriceIdx = findColumn(headers, mapping.entry_price);
    const qtyIdx = findColumn(headers, mapping.quantity);
    const entryTimeIdx = findColumn(headers, mapping.entry_time);

    if (symbolIdx === -1 || entryPriceIdx === -1 || qtyIdx === -1) {
      return null;
    }

    const symbol = String(row[symbolIdx] || '').trim().toUpperCase();
    let tradeType = String(row[typeIdx] || 'long').toLowerCase();
    
    // Normalize trade type
    if (tradeType.includes('buy') || tradeType === 'b') tradeType = 'long';
    if (tradeType.includes('sell') || tradeType === 's') tradeType = 'short';
    if (!['long', 'short'].includes(tradeType)) tradeType = 'long';

    const entryPrice = parseFloat(String(row[entryPriceIdx] || 0));
    const quantity = parseInt(String(row[qtyIdx] || 0));

    if (!symbol || entryPrice <= 0 || quantity <= 0) {
      return null;
    }

    const trade: ParsedTrade = {
      symbol,
      trade_type: tradeType,
      entry_price: entryPrice,
      quantity,
      entry_time: row[entryTimeIdx] || new Date().toISOString(),
    };

    // Optional fields
    const exitPriceIdx = findColumn(headers, mapping.exit_price || []);
    if (exitPriceIdx !== -1 && row[exitPriceIdx]) {
      trade.exit_price = parseFloat(String(row[exitPriceIdx]));
    }

    const exitTimeIdx = findColumn(headers, mapping.exit_time || []);
    if (exitTimeIdx !== -1 && row[exitTimeIdx]) {
      trade.exit_time = String(row[exitTimeIdx]);
    }

    const pnlIdx = findColumn(headers, mapping.pnl || []);
    if (pnlIdx !== -1 && row[pnlIdx]) {
      trade.pnl = parseFloat(String(row[pnlIdx]));
    }

    // Auto-detect asset type from symbol
    if (symbol.includes('.NS') || symbol.includes('.BO')) {
      trade.asset_type = 'stock';
    } else if (symbol.endsWith('USD') || symbol.length === 6) {
      trade.asset_type = symbol.length === 6 ? 'forex' : 'crypto';
    } else {
      trade.asset_type = 'stock';
    }

    return trade;
  } catch (error) {
    console.error('Error parsing row:', error);
    return null;
  }
}

// ✅ CRITICAL: Must use "export async function POST"
export async function POST(request: Request) {
  try {
    console.log('🔵 POST /api/trades/import - Request received');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Unauthorized - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData, brokerFormat } = body;

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid CSV data',
        details: 'CSV must have at least headers and one data row'
      }, { status: 400 });
    }

    console.log(`📊 Processing CSV import: ${csvData.length} rows`);

    const headers = csvData[0];
    const rows = csvData.slice(1);

    // Auto-detect broker format if not provided
    const format = brokerFormat || detectBrokerFormat(headers);
    const mapping = BROKER_MAPPINGS[format as keyof typeof BROKER_MAPPINGS] || BROKER_MAPPINGS.generic;

    console.log(`🔍 Detected format: ${format}`);

    // Parse all rows
    const parsedTrades: ParsedTrade[] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      const trade = parseRowToTrade(row, headers, mapping);
      if (trade) {
        parsedTrades.push(trade);
      } else {
        errors.push(`Row ${idx + 2}: Invalid or incomplete data`);
      }
    });

    if (parsedTrades.length === 0) {
      return NextResponse.json({
        error: 'No valid trades found in CSV',
        details: errors.slice(0, 5),
        totalErrors: errors.length,
      }, { status: 400 });
    }

    console.log(`✅ Parsed ${parsedTrades.length} valid trades`);

    // Calculate P&L for closed trades
    const tradesWithPnL = parsedTrades.map(trade => {
      const positionSize = trade.entry_price * trade.quantity;
      
      let pnl = trade.pnl;
      let pnlPercentage = 0;
      let status = 'open';

      if (trade.exit_price) {
        if (pnl === undefined) {
          const exitValue = trade.exit_price * trade.quantity;
          pnl = trade.trade_type === 'long' 
            ? exitValue - positionSize 
            : positionSize - exitValue;
        }
        
        pnlPercentage = (pnl / positionSize) * 100;
        
        if (pnl > 0) status = 'win';
        else if (pnl < 0) status = 'loss';
        else status = 'breakeven';
      }

      return {
        user_id: session.user.id,
        symbol: trade.symbol,
        asset_type: trade.asset_type || 'stock',
        trade_type: trade.trade_type,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price || null,
        quantity: trade.quantity,
        position_size: positionSize,
        pnl: pnl || null,
        pnl_percentage: pnlPercentage || null,
        status,
        entry_time: trade.entry_time,
        exit_time: trade.exit_time || null,
        stop_loss: trade.stop_loss || null,
        target_price: trade.target_price || null,
        setup_type: trade.setup_type || null,
        timeframe: '1d',
        reason: `Imported from CSV (${format})`,
      };
    });

    // Insert into database
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('trades')
      .insert(tradesWithPnL)
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({
        error: 'Failed to import trades',
        details: error.message,
      }, { status: 500 });
    }

    console.log(`💾 Imported ${data?.length || 0} trades successfully`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data?.length || 0} trades`,
      imported: data?.length || 0,
      skipped: errors.length,
      errors: errors.slice(0, 5),
      detectedFormat: format,
    });

  } catch (error: any) {
    console.error('❌ CSV import error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process CSV',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// ✅ CRITICAL: Must use "export async function GET"
export async function GET(request: Request) {
  try {
    console.log('🔵 GET /api/trades/import - Request received');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      supportedFormats: Object.keys(BROKER_MAPPINGS),
      requiredColumns: ['symbol', 'entry_price', 'quantity'],
      optionalColumns: ['exit_price', 'trade_type', 'pnl', 'entry_time', 'exit_time'],
      sampleFormat: {
        symbol: 'RELIANCE.NS',
        trade_type: 'long',
        entry_price: 2500.50,
        exit_price: 2550.00,
        quantity: 10,
        entry_time: '2024-01-15',
        exit_time: '2024-01-16',
      },
    });

  } catch (error: any) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}