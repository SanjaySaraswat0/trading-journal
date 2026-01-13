// File: src/app/api/trades/route.ts
// COMPLETE VERSION - All CRUD operations

import { NextResponse } from 'next/server';

// CREATE - Add new trade
export async function POST(request: Request) {
  console.log('=== POST /api/trades START ===');
  
  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth/options');
    const { createServiceClient } = await import('@/lib/supabase/service');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Check/create profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: session.user.id,
        email: session.user.email as string,
        name: session.user.name || 'User',
        subscription_type: 'free',
        trading_experience: 'beginner',
        preferred_markets: ['stocks']
      } as any);
    }

    const body = await request.json();

    if (!body.symbol || !body.entry_price || !body.quantity || !body.position_size || !body.entry_time) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Calculate P&L
    let pnl = null;
    let pnl_percentage = null;
    let status = 'open';

    if (body.exit_price && body.exit_price !== '') {
      const entry = parseFloat(body.entry_price);
      const exit = parseFloat(body.exit_price);
      const qty = parseInt(body.quantity);
      const posSize = parseFloat(body.position_size);
      
      if (body.trade_type === 'long') {
        pnl = (exit - entry) * qty;
      } else {
        pnl = (entry - exit) * qty;
      }
      
      pnl_percentage = (pnl / posSize) * 100;
      
      if (pnl > 0) status = 'win';
      else if (pnl < 0) status = 'loss';
      else status = 'breakeven';
    }

    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        user_id: session.user.id,
        symbol: String(body.symbol).toUpperCase(),
        asset_type: body.asset_type || 'stock',
        trade_type: body.trade_type || 'long',
        entry_price: parseFloat(body.entry_price),
        exit_price: body.exit_price ? parseFloat(body.exit_price) : null,
        stop_loss: body.stop_loss ? parseFloat(body.stop_loss) : null,
        target_price: body.target_price ? parseFloat(body.target_price) : null,
        quantity: parseInt(body.quantity),
        position_size: parseFloat(body.position_size),
        pnl,
        pnl_percentage,
        status,
        entry_time: body.entry_time,
        exit_time: body.exit_time || null,
        timeframe: body.timeframe || null,
        setup_type: body.setup_type || null,
        reason: body.reason || null,
        screenshot_url: body.screenshot_url || null,
        emotions: body.emotions || [],
        tags: body.tags || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trade, success: true }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// READ - Get all trades
export async function GET(request: Request) {
  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth/options');
    const { createServiceClient } = await import('@/lib/supabase/service');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_time', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trades: trades || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE - Edit existing trade
export async function PUT(request: Request) {
  console.log('=== PUT /api/trades START ===');
  
  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth/options');
    const { createServiceClient } = await import('@/lib/supabase/service');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    // Recalculate P&L if exit price provided
    if (updateData.exit_price && updateData.entry_price && updateData.quantity) {
      const entry = parseFloat(updateData.entry_price);
      const exit = parseFloat(updateData.exit_price);
      const qty = parseInt(updateData.quantity);
      const posSize = parseFloat(updateData.position_size);
      
      let pnl;
      if (updateData.trade_type === 'long') {
        pnl = (exit - entry) * qty;
      } else {
        pnl = (entry - exit) * qty;
      }
      
      updateData.pnl = pnl;
      updateData.pnl_percentage = (pnl / posSize) * 100;
      
      if (pnl > 0) updateData.status = 'win';
      else if (pnl < 0) updateData.status = 'loss';
      else updateData.status = 'breakeven';
    }

    updateData.updated_at = new Date().toISOString();

    const { data: trade, error } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Trade update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Trade updated successfully');
    return NextResponse.json({ trade, success: true });

  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove trade
export async function DELETE(request: Request) {
  console.log('=== DELETE /api/trades START ===');
  
  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth/options');
    const { createServiceClient } = await import('@/lib/supabase/service');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Trade delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Trade deleted successfully');
    return NextResponse.json({ success: true, message: 'Trade deleted' });

  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}