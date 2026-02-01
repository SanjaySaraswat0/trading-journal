// components/analysis/AdvancedAnalysisResults.tsx
// Beautiful UI component to display advanced analysis

import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Brain,
  Calendar,
  Target,
  Shield,
  Zap,
  X
} from 'lucide-react';

interface AdvancedAnalysisResultsProps {
  analysis: any;
  onClose: () => void;
}

export default function AdvancedAnalysisResults({ analysis, onClose }: AdvancedAnalysisResultsProps) {
  if (!analysis) return null;

  const { patterns, ai_insights, summary } = analysis;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-2xl">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Advanced AI Analysis</h2>
                  <p className="text-purple-100 text-sm">
                    {summary.trades_analyzed} trades analyzed • Win Rate: {summary.win_rate}%
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* QUICK SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-blue-600 text-sm font-medium">Total Trades</div>
                <div className="text-2xl font-bold text-blue-900">{summary.total_trades}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-green-600 text-sm font-medium">Win Rate</div>
                <div className="text-2xl font-bold text-green-900">{summary.win_rate}%</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-red-600 text-sm font-medium">Max Loss Streak</div>
                <div className="text-2xl font-bold text-red-900">{summary.max_losing_streak}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-orange-600 text-sm font-medium">Main Risk Issue</div>
                <div className="text-sm font-bold text-orange-900">{summary.biggest_risk_issue}</div>
              </div>
            </div>

            {/* BIGGEST MISTAKES */}
            {ai_insights?.biggest_mistakes && ai_insights.biggest_mistakes.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Your Biggest Mistakes (Fix These First!)
                </h3>
                <div className="space-y-4">
                  {ai_insights.biggest_mistakes.map((mistake: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded mr-2">
                            {mistake.category}
                          </span>
                          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                            {mistake.impact} Impact
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{mistake.frequency}</span>
                      </div>
                      <h4 className="font-bold text-red-900 mb-2">{mistake.mistake}</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Why Harmful:</span> {mistake.why_harmful}
                      </p>
                      <div className="bg-green-50 p-3 rounded mt-2">
                        <p className="text-sm text-green-900">
                          <span className="font-semibold">✅ How to Fix:</span> {mistake.how_to_fix}
                        </p>
                      </div>
                      {mistake.examples && mistake.examples.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          Examples: {mistake.examples.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TIME-BASED INSIGHTS */}
            {ai_insights?.time_based_insights && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  When You Make Most Mistakes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-2">⚠️ Worst Trading Hours</h4>
                    <div className="space-y-1">
                      {ai_insights.time_based_insights.worst_trading_hours?.map((hour: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700">• {hour} - Avoid trading</div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-green-700 mb-2">✅ Best Trading Hours</h4>
                    <div className="space-y-1">
                      {ai_insights.time_based_insights.best_trading_hours?.map((hour: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700">• {hour} - Trade here</div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-2">❌ Worst Days</h4>
                    <div className="space-y-1">
                      {ai_insights.time_based_insights.worst_days?.map((day: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700">• {day}</div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-green-700 mb-2">✅ Best Days</h4>
                    <div className="space-y-1">
                      {ai_insights.time_based_insights.best_days?.map((day: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700">• {day}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-100 p-3 rounded">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">💡 Recommendation:</span> {ai_insights.time_based_insights.recommendation}
                  </p>
                </div>
              </div>
            )}

            {/* STRONGEST AREAS */}
            {ai_insights?.strongest_areas && ai_insights.strongest_areas.length > 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Your Strongest Areas (Keep Doing This!)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ai_insights.strongest_areas.map((strength: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-bold text-green-900 mb-2">{strength.strength}</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Evidence:</span> {strength.evidence}
                      </p>
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Leverage:</span> {strength.how_to_leverage}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PSYCHOLOGICAL ANALYSIS */}
            {ai_insights?.psychological_analysis && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  Psychological Analysis
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-900">Mental State Score</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-purple-700">
                          {ai_insights.psychological_analysis.mental_state_score}/10
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${ai_insights.psychological_analysis.mental_state_score * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  {ai_insights.psychological_analysis.detected_patterns?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Detected Patterns</h4>
                      <div className="flex flex-wrap gap-2">
                        {ai_insights.psychological_analysis.detected_patterns.map((pattern: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ai_insights.psychological_analysis.emotional_triggers?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Emotional Triggers</h4>
                      <div className="flex flex-wrap gap-2">
                        {ai_insights.psychological_analysis.emotional_triggers.map((trigger: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            ⚠️ {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ai_insights.psychological_analysis.recommendations?.length > 0 && (
                    <div className="bg-purple-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {ai_insights.psychological_analysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-sm text-purple-900">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETUP RECOMMENDATIONS */}
            {ai_insights?.setup_recommendations && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Setup Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ai_insights.setup_recommendations.avoid_setups?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-red-700 mb-2">❌ Avoid These Setups</h4>
                      <ul className="space-y-1">
                        {ai_insights.setup_recommendations.avoid_setups.map((setup: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {setup}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ai_insights.setup_recommendations.focus_on_setups?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">✅ Focus on These Setups</h4>
                      <ul className="space-y-1">
                        {ai_insights.setup_recommendations.focus_on_setups.map((setup: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {setup}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {ai_insights.setup_recommendations.setup_improvement_plan && (
                  <div className="mt-4 bg-orange-100 p-3 rounded">
                    <p className="text-sm text-orange-900">{ai_insights.setup_recommendations.setup_improvement_plan}</p>
                  </div>
                )}
              </div>
            )}

            {/* RISK MANAGEMENT */}
            {ai_insights?.risk_management_issues && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-yellow-900 flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    Risk Management Analysis
                  </h3>
                  <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                    ai_insights.risk_management_grade === 'A' ? 'bg-green-100 text-green-800' :
                    ai_insights.risk_management_grade === 'B' ? 'bg-blue-100 text-blue-800' :
                    ai_insights.risk_management_grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Grade: {ai_insights.risk_management_grade}
                  </div>
                </div>
                <div className="space-y-3">
                  {ai_insights.risk_management_issues.map((issue: any, i: number) => (
                    <div key={i} className={`bg-white p-4 rounded-lg border-l-4 ${
                      issue.severity === 'Critical' ? 'border-red-500' :
                      issue.severity === 'High' ? 'border-orange-500' :
                      issue.severity === 'Medium' ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{issue.issue}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          issue.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                          issue.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Fix:</span> {issue.fix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30-DAY PLAN */}
            {ai_insights?.next_30_days_plan && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6" />
                  Your 30-Day Improvement Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-2">🎯 Immediate Actions</h4>
                    <ul className="space-y-1">
                      {ai_insights.next_30_days_plan.immediate_actions?.map((action: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-2">📅 Weekly Goals</h4>
                    <ul className="space-y-1">
                      {ai_insights.next_30_days_plan.weekly_goals?.map((goal: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {goal}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-green-700 mb-2">✅ Habits to Build</h4>
                    <ul className="space-y-1">
                      {ai_insights.next_30_days_plan.habits_to_build?.map((habit: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {habit}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-2">❌ Habits to Break</h4>
                    <ul className="space-y-1">
                      {ai_insights.next_30_days_plan.habits_to_break?.map((habit: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {habit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* PERSONALIZED MESSAGE */}
            {ai_insights?.personalized_message && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💬</div>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900 mb-2">Message from Your AI Trading Coach</h3>
                    <p className="text-gray-800 leading-relaxed">{ai_insights.personalized_message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}