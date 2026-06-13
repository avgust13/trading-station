import { dayKey, type TzMode } from "@/lib/calendar/datetime";

import type { Exchange, Trade } from "./types";

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

export interface ExchangeSummary {
  exchange: Exchange;
  capital: number;
  totalPnl: number;
  todayPnl: number;
  /** Realized P&L as % of capital; null when capital is 0. */
  returnPct: number | null;
  openCount: number;
  /** Capital as % of total capital across all exchanges; null when total is 0. */
  allocationPct: number | null;
}

export interface ExchangeBreakdown {
  rows: ExchangeSummary[];
  total: {
    capital: number;
    totalPnl: number;
    todayPnl: number;
    returnPct: number | null;
  };
}

/** Per-exchange balances + P&L, plus a grand total. */
export function computeExchangeSummaries(
  trades: Trade[],
  exchanges: Exchange[],
  tz: TzMode,
  now: Date = new Date(),
): ExchangeBreakdown {
  const todayKey = dayKey(now, tz);
  const totalCapital = exchanges.reduce((s, e) => s + e.capital, 0);

  const rows: ExchangeSummary[] = exchanges.map((exchange) => {
    const own = trades.filter((t) => t.exchangeId === exchange.id);
    const closed = own.filter((t) => t.status === "closed");
    const totalPnl = closed.reduce((s, t) => s + t.realizedPnl, 0);
    const todayPnl = closed
      .filter((t) => t.closedAt && dayKey(t.closedAt, tz) === todayKey)
      .reduce((s, t) => s + t.realizedPnl, 0);
    return {
      exchange,
      capital: exchange.capital,
      totalPnl,
      todayPnl,
      returnPct: exchange.capital > 0 ? (totalPnl / exchange.capital) * 100 : null,
      openCount: own.length - closed.length,
      allocationPct: totalCapital > 0 ? (exchange.capital / totalCapital) * 100 : null,
    };
  });

  const totalPnl = rows.reduce((s, r) => s + r.totalPnl, 0);
  return {
    rows,
    total: {
      capital: totalCapital,
      totalPnl,
      todayPnl: rows.reduce((s, r) => s + r.todayPnl, 0),
      returnPct: totalCapital > 0 ? (totalPnl / totalCapital) * 100 : null,
    },
  };
}

export interface EquityPoint {
  /** Unix seconds, UTC. */
  time: number;
  value: number;
}

/**
 * Equity curve over closed trades: starts at `capital` (the deposit baseline)
 * and steps by each closed trade's realizedPnl in `closedAt` order. Points that
 * share a `closedAt` second are collapsed into one (lightweight-charts requires
 * strictly ascending, unique times). Returns [] when there are no closed trades.
 */
export function buildEquityCurve(trades: Trade[], capital: number): EquityPoint[] {
  const closed = trades
    .filter((t): t is Trade & { closedAt: string } => t.status === "closed" && t.closedAt !== null)
    .sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  if (closed.length === 0) return [];

  const firstSec = Math.floor(Date.parse(closed[0].closedAt) / 1000);
  // Anchor one second before the first close so the line visibly starts at the deposit.
  const points: EquityPoint[] = [{ time: firstSec - 1, value: capital }];

  let running = capital;
  for (const t of closed) {
    running += t.realizedPnl;
    const time = Math.floor(Date.parse(t.closedAt) / 1000);
    const last = points[points.length - 1];
    if (last.time === time) last.value = running;
    else points.push({ time, value: running });
  }
  return points;
}
