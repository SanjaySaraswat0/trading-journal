// File: src/app/api/ai/analyze-trade/route.ts
// FINAL VERSION - Fixed TypeScript types

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';
import { detectTradeMistakes } from '@/lib/gemini/mistake-rules';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ✅ Fixed: Proper type definition
interface TradeData {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  quantity: number;
  position_size: number;
  pnl: number | null;
  pnl_percentage: number | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  timeframe: string | null;
  setup_type: string | null;
  reason: string | null;
  screenshot_url: string | null;
  emotions: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

async function generateAIAnalysis(trade: TradeData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are an expert trading analyst. Analyze this trade and provide insights in JSON format.

Trade Details:
- Symbol: ${trade.symbol}
- Type: ${trade.trade_type.toUpperCase()}
- Entry: $${trade.entry_price}
- Exit: ${trade.exit_price ? `$${trade.exit_price}` : 'Open'}
- Stop Loss: ${trade.stop_loss ? `$${trade.stop_loss}` : 'Not Set'}
- Target: ${trade.target_price ? `$${trade.target_price}` : 'Not Set'}
- Quantity: ${trade.quantity}
- P&L: ${trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'N/A'}
- Status: ${trade.status}
- Reason: ${trade.reason || 'Not provided'}
- Emotions: ${trade.emotions?.join(', ') || 'None'}
- Tags: ${trade.tags?.join(', ') || 'None'}

Provide analysis in this EXACT JSON format:
{
  "mistakes": [
    {"type": "RISK_MANAGEMENT", "description": "Issue found", "severity": "high", "suggestion": "How to fix"}
  ],
  "strengths": [
    {"aspect": "What was good", "description": "Why", "recommendation": "Keep doing"}
  ],
  "emotional_analysis": {
    "detected_emotions": ["confidence"],
    "emotional_score": 7,
    "impact_on_trade": "Impact description",
    "suggestions": ["Suggestion 1"]
  },
  "risk_analysis": {
    "risk_reward_ratio": 2.5,
    "position_sizing": "appropriate",
    "stop_loss_quality": "good",
    "recommendations": ["Rec 1"]
  },
  "overall_rating": 7,
  "summary": "Trade summary"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return {
      mistakes: [],
      strengths: [],
      emotional_analysis: {
        detected_emotions: [],
        emotional_score: 5,
        impact_on_trade: "Unable to analyze",
        suggestions: []
      },
      risk_analysis: {
        risk_reward_ratio: 0,
        position_sizing: "unknown",
        stop_loss_quality: "unknown",
        recommendations: []
      },
      overall_rating: 5,
      summary: "AI analysis unavailable. Using rule-based detection only."
    };
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { tradeId } = body;

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    console.log('🔍 Analyzing trade:', tradeId);

    const supabase = createServiceClient();
    
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', session.user.id)
      .single();

    if (tradeError || !trade) {
      console.error('Trade fetch error:', tradeError);
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    console.log('✅ Trade found:', trade.symbol);

    const { data: allTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_time', { ascending: false })
      .limit(50);

    console.log('📊 Context trades:', allTrades?.length || 0);

    // ✅ Fixed: Type assertion for compatibility
    const ruleMistakes = detectTradeMistakes(trade as any, (allTrades || []) as any);
    console.log('⚠️ Rule mistakes found:', ruleMistakes.length);

    console.log('🤖 Generating AI analysis...');
    const aiAnalysis = await generateAIAnalysis(trade);
    console.log('✅ AI analysis completed');

    const combinedAnalysis = {
      trade_id: tradeId,
      rule_based_mistakes: ruleMistakes,
      ai_analysis: aiAnalysis,
      analyzed_at: new Date().toISOString(),
      total_mistakes_found: ruleMistakes.length + (aiAnalysis.mistakes?.length || 0)
    };

    try {
      await supabase
        .from('trade_analyses')
        .insert({
          trade_id: tradeId,
          user_id: session.user.id,
          ai_analysis: aiAnalysis,
          mistakes_detected: ruleMistakes.map((m: any) => m.id),
          patterns_identified: [],
          confidence_score: aiAnalysis.overall_rating || 0
        });
      console.log('💾 Analysis saved to database');
    } catch (saveError: any) {
      console.warn('⚠️ Could not save:', saveError.message);
    }

    return NextResponse.json({
      success: true,
      analysis: combinedAnalysis
    });

  } catch (error: any) {
    console.error('❌ Analysis Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('tradeId');

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('trade_analyses')
      .select('*')
      .eq('trade_id', tradeId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ 
        success: true, 
        analysis: null
      });
    }

    return NextResponse.json({
      success: true,
      analysis: data
    });

  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}