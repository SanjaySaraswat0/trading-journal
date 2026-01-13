import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

// ============================================
// GET SINGLE TRADE
// ============================================
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ CRITICAL FIX: Await the params promise
    const params = await props.params;
    const { id } = params;

    console.log('✅ GET /api/trades/[id] - ID:', id);

    const supabase = createServiceClient();
    
    const { data: trade, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('❌ Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    console.log('✅ Trade fetched successfully');
    return NextResponse.json({ trade });
  } catch (error: any) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// UPDATE TRADE
// ============================================
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ CRITICAL FIX: Await the params promise
    const params = await props.params;
    const { id } = params;

    console.log('✅ PUT /api/trades/[id] - ID:', id);

    const body = await request.json();

    // Validate required fields
    if (!body.symbol || !body.entry_price || !body.quantity || !body.position_size || !body.entry_time) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Calculate P&L if exit price exists
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

    // Prepare update data
    const updateData = {
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
      updated_at: new Date().toISOString(),
    };

    const supabase = createServiceClient();

    const { data: trade, error } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return NextResponse.json({ 
        error: 'Database error: ' + error.message 
      }, { status: 500 });
    }

    if (!trade) {
      return NextResponse.json({ 
        error: 'Trade not found or not authorized' 
      }, { status: 404 });
    }

    console.log('✅ Trade updated successfully');
    return NextResponse.json({ trade, success: true });
  } catch (error: any) {
    console.error('❌ PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE TRADE
// ============================================
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ CRITICAL FIX: Await the params promise
    const params = await props.params;
    const { id } = params;

    console.log('✅ DELETE /api/trades/[id] - ID:', id);

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

    console.log('✅ Trade deleted successfully');
    return NextResponse.json({ success: true, message: 'Trade deleted' });
  } catch (error: any) {
    console.error('❌ DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}