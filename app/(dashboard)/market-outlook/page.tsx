'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    TrendingUp, TrendingDown, Minus, Globe, Newspaper,
    Calendar, AlertTriangle, RefreshCw, Zap, BarChart3,
    ArrowUpRight, ArrowDownRight, Clock, Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function MarketOutlookPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [outlook, setOutlook] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [lastFetched, setLastFetched] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchOutlook = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/market-outlook', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            setOutlook(data.outlook);
            setLastFetched(new Date().toLocaleTimeString('en-IN'));
            toast.success('Market outlook updated!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to load market outlook');
        } finally {
            setLoading(false);
        }
    };

    const sentimentColor = (s: string) => {
        const l = s?.toLowerCase();
        if (l === 'bullish' || l === 'strong') return 'text-green-600';
        if (l === 'bearish') return 'text-red-600';
        if (l === 'cautious') return 'text-orange-500';
        return 'text-yellow-600';
    };

    const sentimentBg = (s: string) => {
        const l = s?.toLowerCase();
        if (l === 'bullish') return 'bg-green-100 border-green-400 text-green-800';
        if (l === 'bearish') return 'bg-red-100 border-red-400 text-red-800';
        if (l === 'sideways' || l === 'neutral') return 'bg-gray-100 border-gray-400 text-gray-800';
        return 'bg-orange-100 border-orange-400 text-orange-800';
    };

    const impactBg = (impact: string) => {
        if (impact === 'Positive') return 'bg-green-50 border-l-4 border-green-500';
        if (impact === 'Negative') return 'bg-red-50 border-l-4 border-red-500';
        return 'bg-gray-50 border-l-4 border-gray-400';
    };

    const BiasIcon = ({ bias }: { bias: string }) => {
        if (bias?.toLowerCase() === 'bullish') return <ArrowUpRight className="w-5 h-5 text-green-600" />;
        if (bias?.toLowerCase() === 'bearish') return <ArrowDownRight className="w-5 h-5 text-red-600" />;
        return <Minus className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 text-white px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-2">
                                <Globe className="w-9 h-9 text-blue-300" />
                                AI Market Outlook
                            </h1>
                            <p className="text-indigo-300 text-sm">
                                Powered by Gemini + Live Web Search • Indian Markets Focus
                            </p>
                            {lastFetched && (
                                <p className="text-indigo-400 text-xs mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Last updated: {lastFetched}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={fetchOutlook}
                            disabled={loading}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm 
                         text-white px-6 py-3 rounded-xl font-semibold transition-all 
                         disabled:opacity-60 disabled:cursor-not-allowed border border-white/30"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Analysing...' : 'Get Tomorrow\'s Outlook'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Empty state */}
                {!outlook && !loading && (
                    <div className="text-center py-24">
                        <Globe className="w-20 h-20 text-indigo-300 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-2xl font-bold text-gray-700 mb-3">Ready to Analyse Markets</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Click the button above. Gemini will search the web for latest market data,
                            global cues, FII/DII activity, news & events — then predict tomorrow's outlook.
                        </p>
                        <button
                            onClick={fetchOutlook}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl 
                         font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                        >
                            🔍 Analyse Tomorrow's Market
                        </button>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="text-center py-24">
                        <div className="relative mx-auto w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full" />
                            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                            <Globe className="absolute inset-0 m-auto w-10 h-10 text-indigo-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-700 mb-2">Searching Live Market Data...</h2>
                        <p className="text-gray-500">Analysing global cues, news & predicting tomorrow's movement</p>
                        <div className="mt-6 flex justify-center gap-2 flex-wrap text-xs text-gray-400">
                            {['NSE/BSE Data', 'Global Markets', 'FII/DII Flows', 'News & Events', 'Gift Nifty'].map(t => (
                                <span key={t} className="bg-gray-100 px-3 py-1 rounded-full">{t}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                {outlook && !loading && (
                    <div className="space-y-6">

                        {/* Overall Sentiment Banner */}
                        <div className={`rounded-2xl p-6 border-2 ${sentimentBg(outlook.tomorrowOutlook?.overallSentiment)}`}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="text-5xl">
                                        {outlook.tomorrowOutlook?.overallSentiment?.toLowerCase() === 'bullish' ? '🟢' :
                                            outlook.tomorrowOutlook?.overallSentiment?.toLowerCase() === 'bearish' ? '🔴' : '🟡'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold opacity-70">TOMORROW'S OVERALL SENTIMENT</p>
                                        <h2 className="text-3xl font-black">{outlook.tomorrowOutlook?.overallSentiment?.toUpperCase()}</h2>
                                        <p className="text-sm font-medium opacity-80">
                                            Strength: {outlook.tomorrowOutlook?.sentimentStrength}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm opacity-70">
                                    <p>Analysis as of</p>
                                    <p className="font-semibold">{outlook.lastUpdated}</p>
                                </div>
                            </div>
                        </div>

                        {/* Indian Indices Snapshot */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-indigo-600" />
                                Indian Markets — Current Snapshot
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Nifty 50', data: outlook.marketSnapshot?.nifty50, color: 'indigo' },
                                    { label: 'Bank Nifty', data: outlook.marketSnapshot?.bankNifty, color: 'purple' },
                                    { label: 'Sensex', data: outlook.marketSnapshot?.sensex, color: 'blue' },
                                    { label: 'Gift Nifty', data: outlook.marketSnapshot?.giftNifty, color: 'teal' },
                                ].map(({ label, data, color }) => (
                                    <div key={label} className={`bg-white rounded-xl p-5 shadow-sm border border-${color}-100`}>
                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
                                        <p className={`text-2xl font-black text-${color}-700`}>{data?.level || data?.indication || '—'}</p>
                                        {data?.change && (
                                            <p className={`text-sm font-semibold mt-1 ${data.change?.toString().startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                                                {data.change} ({data.changePercent})
                                            </p>
                                        )}
                                        {data?.indication && !data?.change && (
                                            <p className="text-xs text-gray-500 mt-1">{data.indication}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tomorrow's Prediction Cards */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Zap className="w-6 h-6 text-yellow-500" />
                                Tomorrow's Prediction
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { label: 'Nifty 50', key: 'nifty50', emoji: '📈' },
                                    { label: 'Bank Nifty', key: 'bankNifty', emoji: '🏦' },
                                    { label: 'Sensex', key: 'sensex', emoji: '📊' },
                                ].map(({ label, key, emoji }) => {
                                    const d = outlook.tomorrowOutlook?.[key];
                                    if (!d) return null;
                                    return (
                                        <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-5 py-3 flex items-center justify-between">
                                                <span className="text-white font-bold">{emoji} {label}</span>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sentimentBg(d.bias)}`}>
                                                    {d.bias}
                                                </span>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                {d.expectedRange && (
                                                    <div className="bg-blue-50 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500 mb-1">Expected Range Tomorrow</p>
                                                        <p className="font-black text-xl text-blue-800">
                                                            {d.expectedRange.low} — {d.expectedRange.high}
                                                        </p>
                                                    </div>
                                                )}
                                                {d.keySupport && (
                                                    <div className="flex gap-3">
                                                        <div className="flex-1">
                                                            <p className="text-xs text-green-600 font-semibold mb-1">🛡️ Support</p>
                                                            {d.keySupport.map((s: string, i: number) => (
                                                                <p key={i} className="text-sm font-mono font-bold text-green-700">{s}</p>
                                                            ))}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-red-600 font-semibold mb-1">🚧 Resistance</p>
                                                            {d.keyResistance?.map((r: string, i: number) => (
                                                                <p key={i} className="text-sm font-mono font-bold text-red-700">{r}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-sm text-gray-600 leading-relaxed border-t pt-3">{d.analysis}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Global Markets */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* US Markets */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    🇺🇸 US Markets
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-auto
                    ${outlook.globalMarkets?.usMarkets?.sentiment === 'bullish' ? 'bg-green-100 text-green-700' :
                                            outlook.globalMarkets?.usMarkets?.sentiment === 'bearish' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'}`}>
                                        {outlook.globalMarkets?.usMarkets?.sentiment}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Dow Jones', val: outlook.globalMarkets?.usMarkets?.dow },
                                        { label: 'S&P 500', val: outlook.globalMarkets?.usMarkets?.sp500 },
                                        { label: 'Nasdaq', val: outlook.globalMarkets?.usMarkets?.nasdaq },
                                    ].map(({ label, val }) => (
                                        <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-400">{label}</p>
                                            <p className="font-bold text-sm text-gray-800">{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Asian + Commodities */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    🌏 Asian Markets & Macro
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-auto
                    ${outlook.globalMarkets?.asianMarkets?.sentiment === 'bullish' ? 'bg-green-100 text-green-700' :
                                            outlook.globalMarkets?.asianMarkets?.sentiment === 'bearish' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'}`}>
                                        {outlook.globalMarkets?.asianMarkets?.sentiment}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Nikkei 225', val: outlook.globalMarkets?.asianMarkets?.nikkei },
                                        { label: 'Hang Seng', val: outlook.globalMarkets?.asianMarkets?.hangSeng },
                                        { label: '🛢️ Crude Oil', val: outlook.globalMarkets?.crudeoil },
                                        { label: '💵 USD/INR', val: outlook.globalMarkets?.usdInr },
                                    ].map(({ label, val }) => (
                                        <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-400">{label}</p>
                                            <p className="font-bold text-sm text-gray-800">{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FII/DII */}
                        {outlook.fiiDii && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-800 mb-4">💼 FII / DII Activity</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center bg-blue-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">FII (Foreign)</p>
                                        <p className={`text-xl font-black ${outlook.fiiDii.fii?.toString().startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                                            {outlook.fiiDii.fii || '—'}
                                        </p>
                                    </div>
                                    <div className="text-center bg-purple-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">DII (Domestic)</p>
                                        <p className={`text-xl font-black ${outlook.fiiDii.dii?.toString().startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                                            {outlook.fiiDii.dii || '—'}
                                        </p>
                                    </div>
                                    <div className="text-center bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Net Flow</p>
                                        <p className={`text-xl font-black ${outlook.fiiDii.netFlow?.toString().startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                                            {outlook.fiiDii.netFlow || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Major News */}
                        {outlook.majorNews && outlook.majorNews.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Newspaper className="w-6 h-6 text-orange-500" />
                                    Major News & Impact
                                </h2>
                                <div className="space-y-3">
                                    {outlook.majorNews.map((news: any, i: number) => (
                                        <div key={i} className={`${impactBg(news.impact)} bg-white rounded-xl p-4`}>
                                            <div className="flex items-start gap-3">
                                                <span className="text-xl mt-0.5">
                                                    {news.impact === 'Positive' ? '📈' : news.impact === 'Negative' ? '📉' : '📋'}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{news.headline}</p>
                                                    {news.affectedSectors && news.affectedSectors.length > 0 && (
                                                        <div className="flex gap-1 mt-2 flex-wrap">
                                                            {news.affectedSectors.map((s: string, j: number) => (
                                                                <span key={j} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap
                          ${news.impact === 'Positive' ? 'bg-green-100 text-green-700' :
                                                        news.impact === 'Negative' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'}`}>
                                                    {news.impact}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming Events */}
                        {outlook.upcomingEvents && outlook.upcomingEvents.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Calendar className="w-6 h-6 text-purple-600" />
                                    Upcoming Events Tomorrow
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {outlook.upcomingEvents.map((event: any, i: number) => (
                                        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                                            <div className={`w-2 h-12 rounded-full flex-shrink-0 
                        ${event.expectedImpact === 'High' ? 'bg-red-500' :
                                                    event.expectedImpact === 'Medium' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                                            <div>
                                                <p className="font-semibold text-gray-800">{event.event}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {event.time} • Impact: <span className={`font-bold
                            ${event.expectedImpact === 'High' ? 'text-red-600' :
                                                            event.expectedImpact === 'Medium' ? 'text-yellow-600' : 'text-blue-600'}`}>
                                                        {event.expectedImpact}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trading Strategy */}
                        {outlook.tradingStrategy && (
                            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
                                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-yellow-400" />
                                    Tomorrow's Trading Strategy
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <p className="text-indigo-300 text-sm font-semibold mb-2">🌅 Opening Strategy (9:15 AM)</p>
                                        <p className="text-white text-sm leading-relaxed">{outlook.tradingStrategy.openingStrategy}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <p className="text-indigo-300 text-sm font-semibold mb-2">🎯 Overall Recommendation</p>
                                        <p className="text-white text-sm leading-relaxed">{outlook.tradingStrategy.recommendation}</p>
                                    </div>
                                    {outlook.tradingStrategy.sectorsToWatch?.length > 0 && (
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <p className="text-indigo-300 text-sm font-semibold mb-2">👁️ Sectors to Watch</p>
                                            <div className="flex flex-wrap gap-2">
                                                {outlook.tradingStrategy.sectorsToWatch.map((s: string, i: number) => (
                                                    <span key={i} className="bg-indigo-600/50 text-white text-xs px-3 py-1 rounded-full">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {outlook.tradingStrategy.riskFactors?.length > 0 && (
                                        <div className="bg-red-900/40 rounded-xl p-4 border border-red-500/30">
                                            <p className="text-red-300 text-sm font-semibold mb-2">⚠️ Risk Factors</p>
                                            <ul className="space-y-1">
                                                {outlook.tradingStrategy.riskFactors.map((r: string, i: number) => (
                                                    <li key={i} className="text-red-100 text-xs flex items-start gap-1">
                                                        <span className="mt-0.5">•</span><span>{r}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-xs">{outlook.disclaimer}</p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
