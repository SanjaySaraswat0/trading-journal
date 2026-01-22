'use client';

import { useState, useEffect } from 'react';
import { Brain, Heart, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface PsychologyEntry {
  pre_trade_confidence: number;
  pre_trade_stress_level: number;
  pre_trade_emotions: string[];
  pre_trade_notes: string;
  was_impulsive: boolean;
  followed_plan: boolean;
  revenge_trade: boolean;
  fomo_trade: boolean;
}

interface PsychologyStats {
  avg_confidence: number;
  avg_stress: number;
  impulsive_rate: number;
  plan_adherence_rate: number;
}

const EMOTION_OPTIONS = [
  { value: 'confident', emoji: '💪', label: 'Confident' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'excited', emoji: '🤩', label: 'Excited' },
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'fearful', emoji: '😨', label: 'Fearful' },
  { value: 'greedy', emoji: '🤑', label: 'Greedy' },
  { value: 'patient', emoji: '⏳', label: 'Patient' },
  { value: 'rushed', emoji: '⚡', label: 'Rushed' },
  { value: 'focused', emoji: '🎯', label: 'Focused' },
  { value: 'distracted', emoji: '🌀', label: 'Distracted' },
];

export default function PsychologyTracker({ tradeId }: { tradeId?: string }) {
  const [entry, setEntry] = useState<PsychologyEntry>({
    pre_trade_confidence: 5,
    pre_trade_stress_level: 5,
    pre_trade_emotions: [],
    pre_trade_notes: '',
    was_impulsive: false,
    followed_plan: true,
    revenge_trade: false,
    fomo_trade: false,
  });

  const [stats, setStats] = useState<PsychologyStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch('/api/psychology/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching psychology stats:', error);
    }
  }

  const toggleEmotion = (emotion: string) => {
    setEntry(prev => ({
      ...prev,
      pre_trade_emotions: prev.pre_trade_emotions.includes(emotion)
        ? prev.pre_trade_emotions.filter(e => e !== emotion)
        : [...prev.pre_trade_emotions, emotion],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          trade_id: tradeId || null,
        }),
      });

      if (response.ok) {
        alert('✅ Psychology entry saved!');
        fetchStats();
        // Reset form
        setEntry({
          pre_trade_confidence: 5,
          pre_trade_stress_level: 5,
          pre_trade_emotions: [],
          pre_trade_notes: '',
          was_impulsive: false,
          followed_plan: true,
          revenge_trade: false,
          fomo_trade: false,
        });
      } else {
        alert('❌ Failed to save entry');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Error saving entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats Toggle */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Trading Psychology</h2>
              <p className="text-purple-100 text-sm">Track your mental state</p>
            </div>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
          >
            {showStats ? 'Hide Stats' : 'View Stats'}
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Avg Confidence</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">{stats.avg_confidence}/10</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Avg Stress</span>
            </div>
            <p className="text-3xl font-bold text-orange-700">{stats.avg_stress}/10</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Impulsive Rate</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{stats.impulsive_rate.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Plan Adherence</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{stats.plan_adherence_rate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">How are you feeling?</h3>

        {/* Confidence Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confidence Level: <span className="text-blue-600 font-bold">{entry.pre_trade_confidence}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={entry.pre_trade_confidence}
            onChange={(e) => setEntry({ ...entry, pre_trade_confidence: parseInt(e.target.value) })}
            className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Not Confident</span>
            <span>Very Confident</span>
          </div>
        </div>

        {/* Stress Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stress Level: <span className="text-orange-600 font-bold">{entry.pre_trade_stress_level}/10</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={entry.pre_trade_stress_level}
            onChange={(e) => setEntry({ ...entry, pre_trade_stress_level: parseInt(e.target.value) })}
            className="w-full h-3 bg-orange-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Very Calm</span>
            <span>Very Stressed</span>
          </div>
        </div>

        {/* Emotions Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Your Emotions:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {EMOTION_OPTIONS.map((emotion) => (
              <button
                key={emotion.value}
                type="button"
                onClick={() => toggleEmotion(emotion.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  entry.pre_trade_emotions.includes(emotion.value)
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-2xl mb-1">{emotion.emoji}</div>
                <div className="text-xs font-medium text-gray-700">{emotion.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Trading Flags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Trade Characteristics:
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={entry.was_impulsive}
                onChange={(e) => setEntry({ ...entry, was_impulsive: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="flex-1">
                <span className="font-medium text-gray-900">Impulsive Decision</span>
                <span className="block text-xs text-gray-500">Did you make this decision quickly without full analysis?</span>
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={!entry.followed_plan}
                onChange={(e) => setEntry({ ...entry, followed_plan: !e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="flex-1">
                <span className="font-medium text-gray-900">Deviated from Plan</span>
                <span className="block text-xs text-gray-500">Did you break your trading rules?</span>
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={entry.revenge_trade}
                onChange={(e) => setEntry({ ...entry, revenge_trade: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="flex-1">
                <span className="font-medium text-gray-900">Revenge Trading</span>
                <span className="block text-xs text-gray-500">Trying to recover from a previous loss?</span>
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={entry.fomo_trade}
                onChange={(e) => setEntry({ ...entry, fomo_trade: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="flex-1">
                <span className="font-medium text-gray-900">FOMO (Fear of Missing Out)</span>
                <span className="block text-xs text-gray-500">Entering because you don't want to miss profits?</span>
              </span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional):
          </label>
          <textarea
            value={entry.pre_trade_notes}
            onChange={(e) => setEntry({ ...entry, pre_trade_notes: e.target.value })}
            rows={4}
            placeholder="How are you feeling mentally? Any concerns or thoughts?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
        >
          {saving ? '💾 Saving...' : '✅ Save Psychology Entry'}
        </button>
      </div>
    </div>
  );
}