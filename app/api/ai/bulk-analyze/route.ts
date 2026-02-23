// app/api/ai/bulk-analyze/route.ts
// Bulk Analysis API - Automatically analyze all trades (manual + CSV imported)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { detectTradeMistakes } from '@/lib/gemini/mistake-rules';
import { createTradeAnalysisPrompt } from '@/lib/gemini/prompts';

async function callGeminiDirect(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e.substring(0, 150)}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  quantity: number;
  position_size: number;
  pnl: number | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  reason: string | null;
  emotions: string[] | null;
  tags: string[] | null;
}

async function analyzeSingleTrade(trade: Trade, allTrades: Trade[]) {
  try {
    // Rule-based detection
    const mistakes = detectTradeMistakes(trade as any, allTrades as any);

    // AI analysis (only for closed trades to save API calls)
    let aiAnalysis = null;

    if (trade.exit_price && process.env.GEMINI_API_KEY) {
      try {
        const prompt = createTradeAnalysisPrompt(trade as any);
        const text = await callGeminiDirect(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiAnalysis = JSON.parse(jsonMatch[0]);
      } catch (aiError) {
        console.log(`⚠️ AI analysis skipped for ${trade.symbol}`);
      }
    }

    return {
      trade_id: trade.id,
      rule_mistakes: mistakes,
      ai_analysis: aiAnalysis,
      total_mistakes: mistakes.length,
      high_severity_count: mistakes.filter((m: any) => m.severity === 'high').length,
    };
  } catch (error: any) {
    console.error(`❌ Error analyzing trade ${trade.id}:`, error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('\n🟢 === BULK ANALYSIS STARTED ===');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tradeIds = [],
      analyzeAll = false,
      skipExisting = true,
      limit = 100
    } = body;

    const supabase = createServiceClient();

    let tradesToAnalyze: Trade[] = [];

    if (analyzeAll) {
      // Analyze all user trades
      console.log('📊 Fetching all trades for analysis...');

      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_time', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      tradesToAnalyze = data || [];

      // Skip trades that already have analysis
      if (skipExisting) {
        const { data: existingAnalyses } = await supabase
          .from('trade_analyses')
          .select('trade_id')
          .eq('user_id', session.user.id);

        const analyzedTradeIds = new Set(
          (existingAnalyses || []).map((a: any) => a.trade_id)
        );

        tradesToAnalyze = tradesToAnalyze.filter(
          (t) => !analyzedTradeIds.has(t.id)
        );

        console.log(`✅ Found ${tradesToAnalyze.length} unanalyzed trades`);
      }
    } else if (tradeIds.length > 0) {
      // Analyze specific trades
      console.log(`📊 Fetching ${tradeIds.length} specific trades...`);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', session.user.id)
        .in('id', tradeIds);

      if (error) {
        console.error('❌ Fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      tradesToAnalyze = data || [];
    } else {
      return NextResponse.json({
        error: 'Either tradeIds or analyzeAll must be provided',
      }, { status: 400 });
    }

    if (tradesToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No trades to analyze',
        analyzed: 0,
        skipped: 0,
      });
    }

    console.log(`🔄 Analyzing ${tradesToAnalyze.length} trades...`);

    // Get all user trades for context
    const { data: allUserTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_time', { ascending: false })
      .limit(200);

    const contextTrades = allUserTrades || [];

    // Analyze each trade
    const results: any[] = [];
    const analysesToSave: any[] = [];

    for (let i = 0; i < tradesToAnalyze.length; i++) {
      const trade = tradesToAnalyze[i];

      console.log(`📝 [${i + 1}/${tradesToAnalyze.length}] Analyzing ${trade.symbol}...`);

      const analysis = await analyzeSingleTrade(trade, contextTrades);

      if (analysis) {
        results.push(analysis);

        // Prepare for database insert
        analysesToSave.push({
          trade_id: trade.id,
          user_id: session.user.id,
          ai_analysis: analysis.ai_analysis,
          mistakes_detected: analysis.rule_mistakes.map((m: any) => m.id),
          patterns_identified: [],
          confidence_score: analysis.ai_analysis?.overall_rating || 0,
        });
      }

      // Add delay to avoid rate limiting (every 5 trades)
      if ((i + 1) % 5 === 0 && i < tradesToAnalyze.length - 1) {
        console.log('⏸️  Pausing to avoid rate limits...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Analysis completed for ${results.length} trades`);

    // Save to database
    if (analysesToSave.length > 0) {
      console.log('💾 Saving analyses to database...');

      const { error: insertError } = await supabase
        .from('trade_analyses')
        .upsert(analysesToSave, {
          onConflict: 'trade_id',
        });

      if (insertError) {
        console.error('⚠️ Save error:', insertError);
      } else {
        console.log(`💾 Saved ${analysesToSave.length} analyses`);
      }
    }

    // Calculate summary statistics
    const totalMistakes = results.reduce(
      (sum, r) => sum + r.total_mistakes,
      0
    );
    const highSeverityMistakes = results.reduce(
      (sum, r) => sum + r.high_severity_count,
      0
    );

    // Group mistakes by category
    const mistakeCategories: any = {
      RISK_MANAGEMENT: 0,
      TIMING: 0,
      PSYCHOLOGY: 0,
      STRATEGY: 0,
    };

    results.forEach((result) => {
      result.rule_mistakes.forEach((mistake: any) => {
        mistakeCategories[mistake.category]++;
      });
    });

    console.log('🟢 === BULK ANALYSIS COMPLETED ===\n');

    return NextResponse.json({
      success: true,
      analyzed: results.length,
      skipped: tradesToAnalyze.length - results.length,
      summary: {
        total_mistakes: totalMistakes,
        high_severity_mistakes: highSeverityMistakes,
        avg_mistakes_per_trade: (totalMistakes / results.length).toFixed(1),
        mistake_categories: mistakeCategories,
      },
      results,
    });

  } catch (error: any) {
    console.error('❌ Bulk Analysis Error:', error);
    return NextResponse.json({
      error: error.message || 'Bulk analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// GET endpoint to fetch existing analyses
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('tradeId');

    const supabase = createServiceClient();

    if (tradeId) {
      // Get analysis for specific trade
      const { data, error } = await supabase
        .from('trade_analyses')
        .select('*')
        .eq('trade_id', tradeId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({
          success: true,
          analysis: null,
        });
      }

      return NextResponse.json({
        success: true,
        analysis: data,
      });
    } else {
      // Get all analyses
      const { data, error } = await supabase
        .from('trade_analyses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        analyses: data || [],
        count: data?.length || 0,
      });
    }

  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}

