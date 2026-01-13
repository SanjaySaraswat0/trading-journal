// File: src/app/api/psychology/stats/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch last 30 days of entries
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: entries, error } = await supabase
      .from('psychology_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', thirtyDaysAgo);

    if (error) {
      console.error('Psychology stats error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        stats: {
          avg_confidence: 0,
          avg_stress: 0,
          impulsive_rate: 0,
          plan_adherence_rate: 0,
        },
      });
    }

    // Calculate statistics
    const total = entries.length;
    
    const avgConfidence = entries.reduce((sum, e) => sum + (e.pre_trade_confidence || 0), 0) / total;
    const avgStress = entries.reduce((sum, e) => sum + (e.pre_trade_stress_level || 0), 0) / total;
    
    const impulsiveCount = entries.filter(e => e.was_impulsive).length;
    const impulsiveRate = (impulsiveCount / total) * 100;
    
    const followedPlanCount = entries.filter(e => e.followed_plan).length;
    const planAdherenceRate = (followedPlanCount / total) * 100;

    const stats = {
      avg_confidence: Math.round(avgConfidence * 10) / 10,
      avg_stress: Math.round(avgStress * 10) / 10,
      impulsive_rate: Math.round(impulsiveRate * 10) / 10,
      plan_adherence_rate: Math.round(planAdherenceRate * 10) / 10,
    };

    return NextResponse.json({ stats, success: true });
  } catch (error: any) {
    console.error('Psychology stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}