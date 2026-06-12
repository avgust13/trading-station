import { dayKey, type TzMode } from "@/lib/calendar/datetime";

import type { Trade } from "./types";

export interface BlotterStats {
  totalPnl: number;
  todayPnl: number;
  /** Closed trades only. */
  tradeCount: number;
  openCount: number;
  /** 0..100, null when there are no closed trades. */
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  /** Σ wins / |Σ losses|; null when there are no losses yet. */
  profitFactor: number | null;
}

export function computeStats(trades: Trade[], tz: TzMode, now: Date = new Date()): BlotterStats {
  const todayKey = dayKey(now, tz);
  const closed = trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => t.realizedPnl > 0);
  const losses = closed.filter((t) => t.realizedPnl < 0);

  const sum = (list: Trade[]) => list.reduce((s, t) => s + t.realizedPnl, 0);
  const totalWin = sum(wins);
  const totalLoss = sum(losses); // negative

  return {
    totalPnl: sum(closed),
    todayPnl: sum(closed.filter((t) => t.closedAt && dayKey(t.closedAt, tz) === todayKey)),
    tradeCount: closed.length,
    openCount: trades.length - closed.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : null,
    avgWin: wins.length > 0 ? totalWin / wins.length : null,
    avgLoss: losses.length > 0 ? totalLoss / losses.length : null,
    profitFactor: totalLoss < 0 ? totalWin / -totalLoss : null,
  };
}
