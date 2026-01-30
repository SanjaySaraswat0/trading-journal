// app/api/trades/import/route.ts
// ✅ FIXED: Handles both F&O and Stocks Excel formats with proper date parsing

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

function normalizeColumnName(name: string): string {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[,₹$]/g, '').replace(/\(/g, '-').replace(/\)/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ✅ FIXED: Parse Indian date format (DD-MM-YYYY or variations)
function parseDate(value: any): string {
  if (!value) return new Date().toISOString();
  
  // If already a Date object
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // If it's a string
  const str = String(value).trim();
  
  // Try parsing DD-MM-YYYY format (e.g., "04-04-2025")
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      console.log(`✅ Parsed date: ${str} → ${date.toISOString()}`);
      return date.toISOString();
    }
  }
  
  // Try parsing YYYY-MM-DD format
  const yyyymmddMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // Try native Date parsing as last resort
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // Fallback to current date
  console.log(`⚠️ Could not parse date: ${str}, using current date`);
  return new Date().toISOString();
}

// ✅ IMPROVED: Better header detection for both F&O and Stocks formats
function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const normalized = row.map((cell: any) => normalizeColumnName(String(cell)));
    
    // Check for common header patterns
    const hasStockName = normalized.some((n: string) => 
      n.includes('stockname') || n.includes('scripname') || n.includes('symbol') || n.includes('scrip')
    );
    const hasQuantity = normalized.some((n: string) => n.includes('quantity') || n.includes('qty'));
    const hasBuyPrice = normalized.some((n: string) => 
      n.includes('buyprice') || n.includes('buy_price') || n.includes('price')
    );
    const hasBuyDate = normalized.some((n: string) => 
      n.includes('buydate') || n.includes('buy_date') || n.includes('date')
    );
    
    // Must have at least stock name + (quantity OR price)
    if (hasStockName && (hasQuantity || hasBuyPrice || hasBuyDate)) {
      console.log(`✅ Found header row at index ${i}:`, row.slice(0, 8));
      return i;
    }
  }
  
  console.log('❌ Could not find header row, using row 0');
  return 0;
}

// ✅ IMPROVED: Find column with multiple possible names
function findColumn(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h: string) => normalizeColumnName(h));
  
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    
    // Exact match
    let index = normalizedHeaders.indexOf(normalizedName);
    if (index !== -1) return index;
    
    // Partial match
    index = normalizedHeaders.findIndex((h: string) => 
      h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (index !== -1) return index;
  }
  return -1;
}

// ✅ IMPROVED: Parse single row with better validation
function parseRow(row: any[], headers: string[], rowIndex: number): any | null {
  try {
    // Find columns
    const stockNameIdx = findColumn(headers, ['stockname', 'stock_name', 'scrip', 'scripname', 'symbol', 'tradingsymbol']);
    const qtyIdx = findColumn(headers, ['quantity', 'qty', 'volume', 'lot']);
    const buyPriceIdx = findColumn(headers, ['buyprice', 'buy_price', 'entry_price', 'price']);
    const sellPriceIdx = findColumn(headers, ['sellprice', 'sell_price', 'exit_price']);
    const buyDateIdx = findColumn(headers, ['buydate', 'buy_date', 'entry_date', 'date', 'trade_date']);
    const sellDateIdx = findColumn(headers, ['selldate', 'sell_date', 'exit_date']);
    const pnlIdx = findColumn(headers, ['realizedpnl', 'realized_pnl', 'realisedpnl', 'realised_pnl', 'pnl', 'p&l']);

    // Validation: Must have stock name, quantity, buy price
    if (stockNameIdx === -1 || qtyIdx === -1 || buyPriceIdx === -1) {
      return null;
    }

    const stockName = String(row[stockNameIdx] || '').trim();
    if (!stockName || stockName === '' || stockName === 'null' || stockName === 'undefined') {
      return null;
    }

    // Skip summary/total rows
    if (stockName.toLowerCase().includes('total') || 
        stockName.toLowerCase().includes('summary') ||
        stockName.toLowerCase().includes('grand')) {
      return null;
    }

    const quantity = Math.abs(parseNumber(row[qtyIdx]));
    const buyPrice = parseNumber(row[buyPriceIdx]);
    const sellPrice = sellPriceIdx !== -1 ? parseNumber(row[sellPriceIdx]) : 0;
    
    // Parse dates
    const buyDate = buyDateIdx !== -1 ? parseDate(row[buyDateIdx]) : new Date().toISOString();
    const sellDate = sellDateIdx !== -1 && row[sellDateIdx] ? parseDate(row[sellDateIdx]) : null;
    
    // P&L - use from column if available
    let pnl = 0;
    if (pnlIdx !== -1 && row[pnlIdx]) {
      pnl = parseNumber(row[pnlIdx]);
    } else if (sellPrice > 0) {
      pnl = (sellPrice - buyPrice) * quantity;
    }

    // Validation: quantity and buy price must be positive
    if (quantity <= 0 || buyPrice <= 0) {
      return null;
    }

    // Only include closed trades (with sell price)
    if (sellPrice <= 0) {
      console.log(`⚠️ Row ${rowIndex}: ${stockName} - Open position, skipping`);
      return null;
    }

    console.log(`✅ Row ${rowIndex}: ${stockName} | Buy: ₹${buyPrice.toFixed(2)} | Sell: ₹${sellPrice.toFixed(2)} | Qty: ${quantity} | P&L: ₹${pnl.toFixed(2)}`);

    return {
      symbol: stockName,
      entry_price: buyPrice,
      exit_price: sellPrice,
      quantity,
      entry_time: buyDate,
      exit_time: sellDate || buyDate,
      pnl
    };
  } catch (error: any) {
    console.error(`❌ Error parsing row ${rowIndex}:`, error.message);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('\n🟢 === IMPORT STARTED ===');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData) || csvData.length < 2) {
      return NextResponse.json({ error: 'Invalid CSV data' }, { status: 400 });
    }

    // Filter empty rows
    const nonEmptyRows = csvData.filter((row: any) => 
      Array.isArray(row) && row.some((cell: any) => cell && String(cell).trim() !== '')
    );

    if (nonEmptyRows.length < 2) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    console.log(`📊 Total non-empty rows: ${nonEmptyRows.length}`);

    // ✅ Find header row
    const headerRowIndex = findHeaderRow(nonEmptyRows);
    const headers = nonEmptyRows[headerRowIndex];
    const dataRows = nonEmptyRows.slice(headerRowIndex + 1);

    console.log(`📋 Headers (row ${headerRowIndex}):`, headers.slice(0, 10));
    console.log(`📊 Data rows to process: ${dataRows.length}`);

    // ✅ Parse all data rows
    const parsedTrades: any[] = [];
    
    dataRows.forEach((row: any[], idx: number) => {
      const trade = parseRow(row, headers, idx + headerRowIndex + 2);
      if (trade) {
        parsedTrades.push(trade);
      }
    });

    console.log(`✅ Successfully parsed ${parsedTrades.length} closed trades`);

    if (parsedTrades.length === 0) {
      return NextResponse.json({
        error: 'No valid trades found',
        message: 'No closed trades with both Buy and Sell data found',
        hint: 'Make sure your Excel has: Stock Name, Quantity, Buy Price, Buy Date, Sell Price, Sell Date',
        detectedHeaders: headers
      }, { status: 400 });
    }

    // ✅ Prepare for database
    const tradesForDB = parsedTrades.map((trade: any) => {
      const positionSize = trade.entry_price * trade.quantity;
      const pnl = trade.pnl;
      const pnlPercentage = (pnl / positionSize) * 100;
      
      let status = 'breakeven';
      if (pnl > 0.01) {
        status = 'win';
      } else if (pnl < -0.01) {
        status = 'loss';
      }

      console.log(`💰 ${trade.symbol}: Entry=₹${trade.entry_price.toFixed(2)} | Exit=₹${trade.exit_price.toFixed(2)} | P&L=₹${pnl.toFixed(2)} | Status=${status.toUpperCase()}`);

      return {
        user_id: session.user.id,
        symbol: trade.symbol,
        asset_type: 'stock',
        trade_type: 'long',
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        position_size: positionSize,
        pnl,
        pnl_percentage: pnlPercentage,
        status,
        entry_time: trade.entry_time,
        exit_time: trade.exit_time,
        stop_loss: null,
        target_price: null,
        setup_type: null,
        timeframe: '1d',
        reason: 'Imported from Excel',
        emotions: [],
        tags: []
      };
    });

    // ✅ Duplicate check
    const supabase = createServiceClient();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('symbol, entry_price, quantity, exit_price')
      .eq('user_id', session.user.id)
      .gte('created_at', oneHourAgo);

    const existingKeys = new Set(
      (existingTrades || []).map((t: any) => `${t.symbol}_${t.entry_price}_${t.exit_price}_${t.quantity}`)
    );

    const uniqueTrades = tradesForDB.filter((t: any) => {
      const key = `${t.symbol}_${t.entry_price}_${t.exit_price}_${t.quantity}`;
      return !existingKeys.has(key);
    });

    if (uniqueTrades.length === 0) {
      console.log('⚠️ All trades already exist');
      return NextResponse.json({
        success: true,
        message: 'All trades already imported (duplicates skipped)',
        imported: 0,
        skipped: tradesForDB.length
      });
    }

    console.log(`🔄 Inserting ${uniqueTrades.length} new trades (${tradesForDB.length - uniqueTrades.length} duplicates skipped)`);

    // ✅ Insert
    const { data, error: dbError } = await supabase
      .from('trades')
      .insert(uniqueTrades)
      .select();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json({
        error: 'Database error',
        message: dbError.message,
        details: dbError
      }, { status: 500 });
    }

    console.log(`💾 Successfully inserted ${data?.length || 0} trades`);
    console.log('🟢 === IMPORT COMPLETED ===\n');

    // Summary
    const wins = uniqueTrades.filter((t: any) => t.status === 'win').length;
    const losses = uniqueTrades.filter((t: any) => t.status === 'loss').length;
    const totalPnL = uniqueTrades.reduce((sum: number, t: any) => sum + t.pnl, 0);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data?.length || 0} trades`,
      imported: data?.length || 0,
      skipped: tradesForDB.length - uniqueTrades.length,
      summary: {
        wins,
        losses,
        breakeven: uniqueTrades.length - wins - losses,
        totalPnL: totalPnL.toFixed(2),
        winRate: uniqueTrades.length > 0 ? ((wins / uniqueTrades.length) * 100).toFixed(1) + '%' : '0%'
      },
      trades: data
    });

  } catch (error: any) {
    console.error('❌ IMPORT ERROR:', error);
    return NextResponse.json({
      error: 'Import failed',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Smart Excel Import API - Supports both F&O and Stocks formats',
    features: [
      'Auto-detects headers (skips metadata)',
      'Handles Indian date format (DD-MM-YYYY)',
      'Works with both F&O and Stocks reports',
      'Duplicate detection',
      'Validates all data'
    ],
    requiredColumns: {
      fo: ['Scrip Name', 'Quantity', 'Buy Date', 'Buy Price', 'Sell Date', 'Sell Price'],
      stocks: ['Stock name', 'Quantity', 'Buy date', 'Buy price', 'Sell date', 'Sell price']
    }
  });
}