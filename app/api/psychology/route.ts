// File: src/app/api/psychology/route.ts
// FINAL VERSION - Uses PROFILES table only

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    // Create profile if doesn't exist
    if (!profile) {
      await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email as string,
          name: session.user.name || 'User',
          subscription_type: 'free',
          trading_experience: 'beginner',
          preferred_markets: ['stocks']
        } as any);
    }

    const body = await request.json();

    // Only insert fields that exist in database
    const insertData: any = {
      user_id: session.user.id,
      trade_id: body.trade_id || null,
      was_impulsive: body.was_impulsive || false,
      followed_plan: body.followed_plan !== false,
      revenge_trade: body.revenge_trade || false,
      fomo_trade: body.fomo_trade || false,
    };

    // Add optional fields only if they exist in body
    if (body.pre_trade_confidence !== undefined) {
      insertData.pre_trade_confidence = body.pre_trade_confidence;
    }
    if (body.pre_trade_stress_level !== undefined) {
      insertData.pre_trade_stress_level = body.pre_trade_stress_level;
    }
    if (body.pre_trade_emotions) {
      insertData.pre_trade_emotions = body.pre_trade_emotions;
    }
    if (body.pre_trade_notes) {
      insertData.pre_trade_notes = body.pre_trade_notes;
    }

    const { data, error } = await supabase
      .from('psychology_entries')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Psychology save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data, success: true });
  } catch (error: any) {
    console.error('Psychology API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: entries, error } = await supabase
      .from('psychology_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: entries || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}