'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface DashboardStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  winStreak: number;
  lossStreak: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  weeklyPnL: number;
  monthlyPnL: number;
  riskRewardRatio: number;
  recentTrades: any[];
}

export function useDashboardStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    openTrades: 0,
    closedTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgWin: 0,
    avgLoss: 0,
    bestTrade: 0,
    worstTrade: 0,
    winStreak: 0,
    lossStreak: 0,
    currentStreak: { type: 'none', count: 0 },
    weeklyPnL: 0,
    monthlyPnL: 0,
    riskRewardRatio: 0,
    recentTrades: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats();
    }
  }, [session]);

  async function fetchStats() {
    try {
      setLoading(true);
      console.log('Fetching trades from API...');

      // Fetch trades from API route
      const response = await fetch('/api/trades');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const trades = data.trades || [];

      console.log('Trades fetched:', trades.length);

      if (!trades || trades.length === 0) {
        console.log('No trades found');
        setStats({
          totalTrades: 0,
          openTrades: 0,
          closedTrades: 0,
          winRate: 0,
          totalPnL: 0,
          avgWin: 0,
          avgLoss: 0,
          bestTrade: 0,
          worstTrade: 0,
          winStreak: 0,
          lossStreak: 0,
          currentStreak: { type: 'none', count: 0 },
          weeklyPnL: 0,
          monthlyPnL: 0,
          riskRewardRatio: 0,
          recentTrades: [],
        });
        setLoading(false);
        return;
      }

      // Calculate stats
      const totalTrades = trades.length;
      const openTrades = trades.filter((t: any) => t.status === 'open').length;
      const closedTrades = trades.filter((t: any) => t.status !== 'open').length;
      
      const winTrades = trades.filter((t: any) => t.status === 'win');
      const lossTrades = trades.filter((t: any) => t.status === 'loss');
      
      const winRate = closedTrades > 0 ? (winTrades.length / closedTrades) * 100 : 0;
      
      const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
      
      const avgWin = winTrades.length > 0
        ? winTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / winTrades.length
        : 0;
      
      const avgLoss = lossTrades.length > 0
        ? lossTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / lossTrades.length
        : 0;
      
      const pnlValues = trades.map((t: any) => t.pnl || 0).filter((p: number) => p !== 0);
      const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
      const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

      // Calculate streaks
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let currentWinStreak = 0;
      let currentLossStreak = 0;
      let currentStreakType: 'win' | 'loss' | 'none' = 'none';
      let currentStreakCount = 0;

      // Sort by entry time (oldest first for streak calculation)
      const sortedTrades = [...trades].sort((a: any, b: any) => 
        new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
      );

      for (let i = 0; i < sortedTrades.length; i++) {
        const trade = sortedTrades[i];
        if (trade.status === 'win') {
          currentWinStreak++;
          currentLossStreak = 0;
          if (i === sortedTrades.length - 1) {
            currentStreakType = 'win';
            currentStreakCount = currentWinStreak;
          }
        } else if (trade.status === 'loss') {
          currentLossStreak++;
          currentWinStreak = 0;
          if (i === sortedTrades.length - 1) {
            currentStreakType = 'loss';
            currentStreakCount = currentLossStreak;
          }
        } else {
          currentWinStreak = 0;
          currentLossStreak = 0;
        }
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }

      // Weekly and Monthly P&L
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyPnL = trades
        .filter((t: any) => new Date(t.entry_time) >= oneWeekAgo)
        .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

      const monthlyPnL = trades
        .filter((t: any) => new Date(t.entry_time) >= oneMonthAgo)
        .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

      // Risk-Reward Ratio
      const riskRewardRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

      // Recent trades (last 5, sorted by entry time descending)
      const recentTrades = [...trades]
        .sort((a: any, b: any) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
        .slice(0, 5);

      console.log('Stats calculated:', {
        totalTrades,
        winRate: winRate.toFixed(2),
        totalPnL: totalPnL.toFixed(2)
      });

      setStats({
        totalTrades,
        openTrades,
        closedTrades,
        winRate,
        totalPnL,
        avgWin,
        avgLoss,
        bestTrade,
        worstTrade,
        winStreak: maxWinStreak,
        lossStreak: maxLossStreak,
        currentStreak: { type: currentStreakType, count: currentStreakCount },
        weeklyPnL,
        monthlyPnL,
        riskRewardRatio,
        recentTrades,
      });

      setError(null);
    } catch (err: any) {
      console.error('Stats fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { stats, loading, error, refetch: fetchStats };
}