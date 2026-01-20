// app/api/trades/route.ts
// Main Trades CRUD API - DO NOT CONFUSE WITH import/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

// ==========================================
// GET ALL TRADES FOR CURRENT USER
// ==========================================
export async function GET(request: Request) {
  try {
    console.log('🟢 MAIN TRADES API - GET /api/trades');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ No session in main trades API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('id');

    const supabase = createServiceClient();

    if (tradeId) {
      // Fetch single trade
      console.log('📋 Fetching single trade:', tradeId);
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('✅ Single trade fetched');
      return NextResponse.json({ trade: data });
    } else {
      // Fetch all trades for user
      console.log('📊 Fetching all trades for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`✅ MAIN API: Fetched ${data?.length || 0} trades`);
      
      // Return trades array
      return NextResponse.json({ 
        trades: data || [],
        count: data?.length || 0,
        user_id: session.user.id 
      });
    }
  } catch (error: any) {
    console.error('❌ GET /api/trades error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// CREATE NEW TRADE
// ==========================================
export async function POST(request: Request) {
  try {
    console.log('🟢 MAIN TRADES API - POST /api/trades');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Calculate P&L
    const positionSize = body.entry_price * body.quantity;
    let pnl = null;
    let pnlPercentage = null;
    let status = 'open';

    if (body.exit_price) {
      const exitValue = body.exit_price * body.quantity;
      pnl = body.trade_type === 'long' 
        ? exitValue - positionSize 
        : positionSize - exitValue;
      
      pnlPercentage = (pnl / positionSize) * 100;
      
      if (pnl > 0) status = 'win';
      else if (pnl < 0) status = 'loss';
      else status = 'breakeven';
    }

    const tradeData = {
      user_id: session.user.id,
      symbol: body.symbol,
      asset_type: body.asset_type || 'stock',
      trade_type: body.trade_type,
      entry_price: body.entry_price,
      exit_price: body.exit_price || null,
      stop_loss: body.stop_loss || null,
      target_price: body.target_price || null,
      quantity: body.quantity,
      position_size: positionSize,
      pnl,
      pnl_percentage: pnlPercentage,
      status,
      entry_time: body.entry_time || new Date().toISOString(),
      exit_time: body.exit_time || null,
      timeframe: body.timeframe || null,
      setup_type: body.setup_type || null,
      reason: body.reason || null,
      screenshot_url: body.screenshot_url || null,
      emotions: body.emotions || [],
      tags: body.tags || [],
    };

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Trade created:', data.id);
    return NextResponse.json({ trade: data }, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/trades error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create trade' },
      { status: 500 }
    );
  }
}

// ==========================================
// UPDATE TRADE
// ==========================================
export async function PUT(request: Request) {
  try {
    console.log('🟢 MAIN TRADES API - PUT /api/trades');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    // Recalculate P&L if needed
    if (updateData.entry_price && updateData.exit_price && updateData.quantity) {
      const positionSize = updateData.entry_price * updateData.quantity;
      const exitValue = updateData.exit_price * updateData.quantity;
      const pnl = updateData.trade_type === 'long' 
        ? exitValue - positionSize 
        : positionSize - exitValue;
      
      updateData.pnl = pnl;
      updateData.pnl_percentage = (pnl / positionSize) * 100;
      updateData.position_size = positionSize;
      
      if (pnl > 0) updateData.status = 'win';
      else if (pnl < 0) updateData.status = 'loss';
      else updateData.status = 'breakeven';
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
      console.error('❌ Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Trade updated:', id);
    return NextResponse.json({ trade: data });
  } catch (error: any) {
    console.error('❌ PUT /api/trades error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update trade' },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE TRADE
// ==========================================
export async function DELETE(request: Request) {
  try {
    console.log('🟢 MAIN TRADES API - DELETE /api/trades');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Trade deleted:', id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/trades error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete trade' },
      { status: 500 }
    );
  }
}