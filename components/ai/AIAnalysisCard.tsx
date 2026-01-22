'use client';

import { useState } from 'react';
import { Brain, AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  [key: string]: any;
}

interface AIAnalysisCardProps {
  trade: Trade;
  onClose: () => void;
}

export default function AIAnalysisCard({ trade, onClose }: AIAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeTradeHandler = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/analyze-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze trade');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: any = {
      RISK_MANAGEMENT: '⚠️',
      TIMING: '⏰',
      PSYCHOLOGY: '🧠',
      STRATEGY: '📊'
    };
    return icons[category] || '📌';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Trade Analysis</h2>
              <p className="text-sm text-gray-600">{trade.symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!analysis && !loading && (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
            <p className="text-gray-600 mb-6">
              Get AI-powered insights on mistakes, strengths, and recommendations
            </p>
            <button
              onClick={analyzeTradeHandler}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 mx-auto"
            >
              <Brain className="w-5 h-5" />
              Analyze with AI
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-bold mb-2">Analyzing Trade...</h3>
            <p className="text-gray-600">This may take a few seconds</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Analysis Failed</p>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={analyzeTradeHandler}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {analysis.ai_analysis?.overall_rating && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Overall Rating</h3>
                    <p className="text-sm text-gray-600">AI evaluation</p>
                  </div>
                  <div className="text-4xl font-bold text-purple-600">
                    {analysis.ai_analysis.overall_rating}/10
                  </div>
                </div>
              </div>
            )}

            {analysis.ai_analysis?.summary && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">📝 Summary</h3>
                <p className="text-gray-700">{analysis.ai_analysis.summary}</p>
              </div>
            )}

            {analysis.rule_based_mistakes && analysis.rule_based_mistakes.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Detected Issues ({analysis.rule_based_mistakes.length})
                </h3>
                <div className="space-y-3">
                  {analysis.rule_based_mistakes.map((mistake: any, i: number) => (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 ${getSeverityColor(mistake.severity)}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{getCategoryIcon(mistake.category)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{mistake.message}</span>
                            <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                              {mistake.severity}
                            </span>
                          </div>
                          <p className="text-sm opacity-90 mb-2">{mistake.suggestion}</p>
                          <div className="text-xs opacity-75">
                            Category: {mistake.category.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.ai_analysis?.mistakes && analysis.ai_analysis.mistakes.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI-Identified Issues
                </h3>
                <div className="space-y-3">
                  {analysis.ai_analysis.mistakes.map((mistake: any, i: number) => (
                    <div key={i} className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{getCategoryIcon(mistake.type)}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-purple-900 mb-1">
                            {mistake.description}
                          </div>
                          <p className="text-sm text-purple-800 mb-2">{mistake.suggestion}</p>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-white rounded">
                              {mistake.type}
                            </span>
                            <span className={`px-2 py-1 rounded ${getSeverityColor(mistake.severity)}`}>
                              {mistake.severity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.ai_analysis?.strengths && analysis.ai_analysis.strengths.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Strengths
                </h3>
                <div className="space-y-3">
                  {analysis.ai_analysis.strengths.map((strength: any, i: number) => (
                    <div key={i} className="bg-white border border-green-200 rounded-lg p-3">
                      <div className="font-semibold text-green-900 mb-1">
                        ✅ {strength.aspect}
                      </div>
                      <p className="text-sm text-green-800 mb-2">{strength.description}</p>
                      <p className="text-xs text-green-700">
                        💡 {strength.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.ai_analysis?.risk_analysis && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4">⚠️ Risk Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">R:R Ratio</p>
                    <p className="text-lg font-bold text-orange-800">
                      {analysis.ai_analysis.risk_analysis.risk_reward_ratio || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Position Size</p>
                    <p className="text-lg font-bold text-orange-800 capitalize">
                      {analysis.ai_analysis.risk_analysis.position_sizing?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 text-center pt-4 border-t">
              Analysis completed at {new Date(analysis.analyzed_at).toLocaleString()}
              <br />
              Total issues: {analysis.total_mistakes_found}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {analysis && (
            <button
              onClick={analyzeTradeHandler}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Re-analyze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}