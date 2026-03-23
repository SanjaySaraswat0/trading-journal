import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
// Use gemini-2.5-flash on v1 API (verified available for this key)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Fetch Indian market data from Yahoo Finance (free, no API key)
async function fetchMarketData() {
  const symbols: Record<string, string> = {
    nifty50: '^NSEI',
    bankNifty: '^NSEBANK',
    sensex: '^BSESN',
    dow: '^DJI',
    sp500: '^GSPC',
    nasdaq: '^IXIC',
    nikkei: '^N225',
    hangSeng: '^HSI',
    crude: 'CL=F',
    usdinr: 'USDINR=X',
  };

  const results: Record<string, any> = {};

  await Promise.allSettled(
    Object.entries(symbols).map(async ([key, symbol]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        });
        if (!r.ok) return;
        const data = await r.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.previousClose || meta.chartPreviousClose;
          
          let changeStr = 'N/A';
          let changePctStr = 'N/A';
          
          if (prevClose && prevClose > 0) {
            const change = price - prevClose;
            const changePct = (change / prevClose) * 100;
            const sign = change > 0 ? '+' : '';
            changeStr = `${sign}${change.toFixed(2)}`;
            changePctStr = `${sign}${changePct.toFixed(2)}`;
          }

          results[key] = {
            price: price.toFixed(2),
            change: changeStr,
            changePct: changePctStr,
          };
        }
      } catch (_) { /* skip failed symbols */ }
    })
  );
  return results;
}

function buildMarketSummary(data: Record<string, any>): string {
  const fmt = (key: string, label: string) => {
    const d = data[key];
    if (!d) return `${label}: N/A`;
    return `${label}: ${d.price} (${d.change} / ${d.changePct}%)`;
  };
  return [
    '=== INDIAN MARKETS ===',
    fmt('nifty50', 'Nifty 50'),
    fmt('bankNifty', 'Bank Nifty'),
    fmt('sensex', 'Sensex'),
    '',
    '=== US MARKETS ===',
    fmt('dow', 'Dow Jones'),
    fmt('sp500', 'S&P 500'),
    fmt('nasdaq', 'Nasdaq'),
    '',
    '=== ASIAN MARKETS ===',
    fmt('nikkei', 'Nikkei 225'),
    fmt('hangSeng', 'Hang Seng'),
    '',
    '=== FOREX & COMMODITIES ===',
    fmt('crude', 'Crude Oil WTI (USD/barrel)'),
    fmt('usdinr', 'USD/INR'),
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dateStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });

    // Step 1: Fetch live market data
    const marketData = await fetchMarketData();
    const marketSummary = buildMarketSummary(marketData);

    const niftyLevel = marketData.nifty50?.price || 'N/A';
    const bankNiftyLevel = marketData.bankNifty?.price || 'N/A';
    const sensexLevel = marketData.sensex?.price || 'N/A';

    // Step 2: Ask Gemini to analyze and predict
    const prompt = `You are a senior Indian stock market analyst. Today is ${dateStr}, ${timeStr} IST.

LIVE MARKET DATA (just fetched):
${marketSummary}

Based on:
1. The above live market data
2. Current global macro environment (US Fed stance, dollar index, crude trends)
3. Indian market technical levels and recent trend
4. Any major upcoming events (RBI, Fed, earnings, budget, geopolitical)
5. FII/DII behavior patterns
6. Sector rotation trends

Provide a comprehensive NEXT TRADING DAY outlook for Indian markets.

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "lastUpdated": "${dateStr} ${timeStr} IST",
  "marketSnapshot": {
    "nifty50": { "level": "${niftyLevel}", "change": "${marketData.nifty50?.change || 'N/A'}", "changePercent": "${marketData.nifty50?.changePct || 'N/A'}%" },
    "bankNifty": { "level": "${bankNiftyLevel}", "change": "${marketData.bankNifty?.change || 'N/A'}", "changePercent": "${marketData.bankNifty?.changePct || 'N/A'}%" },
    "sensex": { "level": "${sensexLevel}", "change": "${marketData.sensex?.change || 'N/A'}", "changePercent": "${marketData.sensex?.changePct || 'N/A'}%" },
    "giftNifty": { "level": "~${niftyLevel}", "indication": "Based on US market cues overnight" }
  },
  "globalMarkets": {
    "usMarkets": { "dow": "${marketData.dow?.price || 'N/A'}", "sp500": "${marketData.sp500?.price || 'N/A'}", "nasdaq": "${marketData.nasdaq?.price || 'N/A'}", "sentiment": "bullish or bearish or neutral based on data" },
    "asianMarkets": { "nikkei": "${marketData.nikkei?.price || 'N/A'}", "hangSeng": "${marketData.hangSeng?.price || 'N/A'}", "shanghai": "N/A", "sentiment": "bullish or bearish or neutral based on data" },
    "crudeoil": "${marketData.crude?.price || 'N/A'} USD/bbl",
    "usdInr": "${marketData.usdinr?.price || 'N/A'}"
  },
  "fiiDii": {
    "fii": "Estimate based on market trend (positive = buying, negative = selling)",
    "dii": "Estimate based on market trend",
    "netFlow": "Overall net institutional flow estimate"
  },
  "tomorrowOutlook": {
    "overallSentiment": "Bullish OR Bearish OR Neutral OR Cautious",
    "sentimentStrength": "Strong OR Moderate OR Weak",
    "nifty50": {
      "expectedRange": { "low": "realistic support number", "high": "realistic resistance number" },
      "keySupport": ["support level 1", "support level 2"],
      "keyResistance": ["resistance level 1", "resistance level 2"],
      "bias": "Bullish OR Bearish OR Sideways",
      "analysis": "2-3 line analysis with reasoning"
    },
    "bankNifty": {
      "expectedRange": { "low": "realistic support number", "high": "realistic resistance number" },
      "keySupport": ["support level 1", "support level 2"],
      "keyResistance": ["resistance level 1", "resistance level 2"],
      "bias": "Bullish OR Bearish OR Sideways",
      "analysis": "2-3 line analysis with reasoning"
    },
    "sensex": {
      "expectedRange": { "low": "realistic number", "high": "realistic number" },
      "bias": "Bullish OR Bearish OR Sideways",
      "analysis": "1-2 line analysis"
    }
  },
  "majorNews": [
    { "headline": "Specific news headline affecting markets", "impact": "Positive OR Negative OR Neutral", "affectedSectors": ["sector1", "sector2"] }
  ],
  "upcomingEvents": [
    { "event": "Specific event name", "time": "IST time or TBD", "expectedImpact": "High OR Medium OR Low" }
  ],
  "tradingStrategy": {
    "openingStrategy": "Specific 9:15 AM strategy based on current data",
    "keyLevelsToWatch": ["level1", "level2", "level3"],
    "sectorsToWatch": ["sector1", "sector2", "sector3"],
    "riskFactors": ["risk1", "risk2", "risk3"],
    "recommendation": "Clear, actionable recommendation for tomorrow"
  },
  "technicalIndicators": {
    "nifty50": {
      "rsi": { "value": "RSI(14) realistic number e.g. 54.2", "signal": "Overbought OR Oversold OR Neutral", "interpretation": "1 line interpretation" },
      "macd": { "value": "MACD line value", "signal": "Bullish crossover OR Bearish crossover OR Neutral", "histogram": "positive or negative or flat" },
      "movingAverages": {
        "ma20": { "value": "20-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" },
        "ma50": { "value": "50-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" },
        "ma200": { "value": "200-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" }
      },
      "bollingerBands": { "upper": "upper band level", "middle": "middle band level", "lower": "lower band level", "signal": "Near upper band (overbought) OR Near lower band (oversold) OR Middle zone (neutral)" },
      "vwap": { "value": "VWAP realistic level", "signal": "Price above VWAP (bullish) OR Price below VWAP (bearish)" },
      "overallSignal": "Strong Buy OR Buy OR Neutral OR Sell OR Strong Sell"
    },
    "bankNifty": {
      "rsi": { "value": "RSI(14) realistic number", "signal": "Overbought OR Oversold OR Neutral", "interpretation": "1 line interpretation" },
      "macd": { "value": "MACD line value", "signal": "Bullish crossover OR Bearish crossover OR Neutral", "histogram": "positive or negative or flat" },
      "movingAverages": {
        "ma20": { "value": "20-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" },
        "ma50": { "value": "50-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" },
        "ma200": { "value": "200-day MA realistic level", "position": "Price above MA (bullish) OR Price below MA (bearish)" }
      },
      "bollingerBands": { "upper": "upper band level", "middle": "middle band level", "lower": "lower band level", "signal": "Near upper band (overbought) OR Near lower band (oversold) OR Middle zone (neutral)" },
      "vwap": { "value": "VWAP realistic level", "signal": "Price above VWAP (bullish) OR Price below VWAP (bearish)" },
      "overallSignal": "Strong Buy OR Buy OR Neutral OR Sell OR Strong Sell"
    }
  },
  "disclaimer": "Analysis based on live market data fetched at ${timeStr} IST and AI model analysis. Not SEBI registered financial advice. Trade at your own risk."
}`;

    const text = await callGemini(prompt);

    // Extract JSON - handle potential markdown wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not parse AI response. Got: ${text.substring(0, 200)}`);
    }

    const outlook = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, outlook });

  } catch (error: any) {
    console.error('Market Outlook Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to generate market outlook' },
      { status: 500 }
    );
  }
}
