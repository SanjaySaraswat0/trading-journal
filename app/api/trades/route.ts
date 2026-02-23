// app/api/trades/route.ts
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { Database } from '@/lib/supabase/database.types';
import { createTradeSchema, tradeIdSchema } from '@/lib/validation/schemas';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { tradeCreationRateLimit, generalApiRateLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logDatabase, logError } from '@/lib/logging/logger';
import { ZodError } from 'zod';

// ⭐ CRITICAL: CORRECT P&L CALCULATION FUNCTION
function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  tradeType: 'long' | 'short'
): { pnl: number; pnlPercentage: number; status: string } {
  let pnl: number;

  if (tradeType === 'long') {
    // Long: Profit when exit > entry
    pnl = (exitPrice - entryPrice) * quantity;
  } else {
    // Short: Profit when entry > exit
    pnl = (entryPrice - exitPrice) * quantity;
  }

  const positionSize = entryPrice * quantity;
  const pnlPercentage = (pnl / positionSize) * 100;

  let status = 'open';
  if (pnl > 0.01) {
    status = 'win';
  } else if (pnl < -0.01) {
    status = 'loss';
  } else {
    status = 'breakeven';
  }

  return { pnl, pnlPercentage, status };
}

// ==========================================
// GET - FETCH TRADES
// ==========================================
export async function GET(request: Request) {
  try {
    logApiRequest('GET', '/api/trades', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized GET /api/trades attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      generalApiRateLimit,
      { blockMessage: 'Too many requests. Please try again later.' }
    );
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('id');

    const supabase = createServiceClient();

    if (tradeId) {
      // Validate trade ID
      try {
        tradeIdSchema.parse({ id: tradeId });
      } catch (err) {
        if (err instanceof ZodError) {
          return NextResponse.json(
            { error: 'Invalid trade ID format', details: err.issues },
            { status: 400 }
          );
        }
      }

      // Single trade
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        logError(error, 'GET single trade', { tradeId, userId: session.user.id });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      logDatabase('SELECT', 'trades', { tradeId, userId: session.user.id });
      return NextResponse.json({ trade: data });
    } else {
      // All trades with optional pagination
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // Validate pagination params
      const safeLimit = Math.min(Math.max(limit, 1), 1000); // Between 1-1000
      const safeOffset = Math.max(offset, 0); // Non-negative

      const query = supabase
        .from('trades')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('entry_time', { ascending: false });

      // Apply pagination
      const { data, error, count } = await query
        .range(safeOffset, safeOffset + safeLimit - 1);

      if (error) {
        logError(error, 'GET all trades', { userId: session.user.id });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      logDatabase('SELECT', 'trades', {
        count: data?.length,
        total: count,
        limit: safeLimit,
        offset: safeOffset,
        userId: session.user.id
      });

      logger.info(`✅ Fetched ${data?.length || 0} trades for user ${session.user.id}`, {
        page: Math.floor(safeOffset / safeLimit) + 1,
        limit: safeLimit,
        total: count
      });

      return NextResponse.json({
        trades: data || [],
        count: data?.length || 0,
        total: count || 0,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: count ? (safeOffset + safeLimit) < count : false
      });
    }
  } catch (error: any) {
    logError(error, 'GET /api/trades');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST - CREATE TRADE
// ==========================================
export async function POST(request: Request) {
  try {
    logApiRequest('POST', '/api/trades', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized POST /api/trades attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for trade creation
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      tradeCreationRateLimit,
      { blockMessage: 'Too many trades created. Please wait before creating more.' }
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = createTradeSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        // ✅ DETAILED ERROR LOGGING
        console.log('❌ VALIDATION FAILED - Details:');
        console.log('Received body:', JSON.stringify(body, null, 2));
        console.log('Validation errors:', JSON.stringify(err.issues, null, 2));

        logger.warn('Trade validation failed', { errors: err.issues, userId: session.user.id });
        return NextResponse.json(
          { error: 'Validation failed', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const positionSize = validatedData.entry_price * validatedData.quantity;
    let pnl = null;
    let pnlPercentage = null;
    let status = 'open';

    if (validatedData.exit_price && validatedData.exit_price > 0) {
      // ⭐ CRITICAL: USE CORRECT CALCULATION
      const result = calculatePnL(
        validatedData.entry_price,
        validatedData.exit_price,
        validatedData.quantity,
        validatedData.trade_type
      );

      pnl = result.pnl;
      pnlPercentage = result.pnlPercentage;
      status = result.status;

      logger.info('P&L calculated', {
        type: validatedData.trade_type,
        entry: validatedData.entry_price,
        exit: validatedData.exit_price,
        qty: validatedData.quantity,
        pnl: pnl.toFixed(2),
        status
      });
    }

    const tradeData = {
      user_id: session.user.id,
      symbol: validatedData.symbol,
      asset_type: validatedData.asset_type || 'stock',
      trade_type: validatedData.trade_type,
      entry_price: validatedData.entry_price,
      exit_price: validatedData.exit_price || null,
      stop_loss: validatedData.stop_loss || null,
      target_price: validatedData.target_price || null,
      quantity: validatedData.quantity,
      position_size: positionSize,
      pnl,
      pnl_percentage: pnlPercentage,
      status,
      entry_time: validatedData.entry_time || new Date().toISOString(),
      exit_time: validatedData.exit_time || null,
      timeframe: validatedData.timeframe || null,
      setup_type: validatedData.setup_type || null,
      reason: validatedData.reason || null,
      emotions: validatedData.emotions || [],
      tags: validatedData.tags || [],
      screenshot_url: validatedData.screenshot_url || null,
    };

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('trades')
      .insert(tradeData as any)
      .select()
      .single();

    if (error) {
      logError(error, 'POST /api/trades - INSERT', { userId: session.user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logDatabase('INSERT', 'trades', { tradeId: (data as any).id, userId: session.user.id, symbol: validatedData.symbol });
    logger.info(`✅ Trade created: ${(data as any).id} for user ${session.user.id}`);
    return NextResponse.json({ trade: data }, { status: 201 });
  } catch (error: any) {
    logError(error, 'POST /api/trades');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT - UPDATE TRADE
// ==========================================
export async function PUT(request: Request) {
  try {
    logApiRequest('PUT', '/api/trades', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized PUT /api/trades attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      generalApiRateLimit,
      { blockMessage: 'Too many requests. Please try again later.' }
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    // Validate trade ID
    try {
      tradeIdSchema.parse({ id });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid trade ID format', details: err.issues },
          { status: 400 }
        );
      }
    }

    // Recalculate P&L if needed
    if (updateData.entry_price && updateData.exit_price && updateData.quantity && updateData.trade_type) {
      const result = calculatePnL(
        updateData.entry_price,
        updateData.exit_price,
        updateData.quantity,
        updateData.trade_type
      );

      updateData.pnl = result.pnl;
      updateData.pnl_percentage = result.pnlPercentage;
      updateData.status = result.status;
      updateData.position_size = updateData.entry_price * updateData.quantity;

      logger.info('P&L recalculated on update', {
        pnl: result.pnl.toFixed(2),
        status: result.status
      });
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      logError(error, 'PUT /api/trades', { tradeId: id, userId: session.user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logDatabase('UPDATE', 'trades', { tradeId: id, userId: session.user.id });
    logger.info(`✅ Trade updated: ${id}`);
    return NextResponse.json({ trade: data });
  } catch (error: any) {
    logError(error, 'PUT /api/trades');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// DELETE - REMOVE TRADE
// ==========================================
export async function DELETE(request: Request) {
  try {
    logApiRequest('DELETE', '/api/trades', undefined);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized DELETE /api/trades attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      generalApiRateLimit,
      { blockMessage: 'Too many requests. Please try again later.' }
    );
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    // Validate trade ID
    try {
      tradeIdSchema.parse({ id });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid trade ID format', details: err.issues },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      logError(error, 'DELETE /api/trades', { tradeId: id, userId: session.user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logDatabase('DELETE', 'trades', { tradeId: id, userId: session.user.id });
    logger.info(`✅ Trade deleted: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, 'DELETE /api/trades');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}