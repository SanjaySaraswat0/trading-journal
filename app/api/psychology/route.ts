// File: src/app/api/psychology/route.ts
// PRODUCTION-READY WITH SECURITY, VALIDATION, AND LOGGING

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { psychologyEntrySchema } from '@/lib/validation/schemas';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { tradeCreationRateLimit } from '@/lib/rate-limit/config';
import { logger, logApiRequest, logDatabase, logError } from '@/lib/logging/logger';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    logApiRequest('POST', '/api/psychology', undefined);

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized psychology entry attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      request,
      session.user.id,
      tradeCreationRateLimit,
      { blockMessage: 'Too many requests. Please slow down.' }
    );
    if (rateLimitResult) return rateLimitResult;

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
      logger.info('Created user profile', { userId: session.user.id });
    }

    const body = await request.json();

    // Validate input - use partial validation for flexible schema
    let validatedData;
    try {
      validatedData = psychologyEntrySchema.partial().parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn('Psychology entry validation failed', { errors: err.issues, userId: session.user.id });
        return NextResponse.json(
          { error: 'Validation failed', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

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
      logError(error, 'Psychology entry save', { userId: session.user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logDatabase('Psychology entry created', 'psychology_entries', { userId: session.user.id, entryId: data.id });
    return NextResponse.json({ entry: data, success: true });
  } catch (error: any) {
    logError(error, 'POST /api/psychology');
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