import "server-only";

import YahooFinance from "yahoo-finance2";

import type { Candle, CandleInterval } from "./types";

// Intraday/daily candles for the trade-details chart. Yahoo limits how far
// back each interval reaches (1m ≈ 7 days and max ~7-day span per request,
// 5m/15m ≈ 60 days, 1h ≈ 730 days), so the interval degrades with trade age.

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  versionCheck: false,
});

const DAY_MS = 86_400_000;

export function pickInterval(fromMs: number, toMs: number, now = Date.now()): CandleInterval {
  const ageDays = (now - fromMs) / DAY_MS;
  const spanDays = (toMs - fromMs) / DAY_MS;
  if (ageDays < 6) return "1m";
  if (ageDays < 55 && spanDays <= 5) return "5m";
  if (ageDays < 55) return "15m";
  if (ageDays < 700) return "1h";
  return "1d";
}

const INTERVAL_SEC: Record<CandleInterval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

export function intervalSeconds(interval: CandleInterval): number {
  return INTERVAL_SEC[interval];
}

export interface CandleFetchResult {
  interval: CandleInterval;
  candles: Candle[];
}

export async function fetchCandles(
  yahooSymbol: string,
  fromMs: number,
  toMs: number,
  forced?: CandleInterval,
): Promise<CandleFetchResult> {
  const interval = forced ?? pickInterval(fromMs, toMs);

  // Pad the window so the trade isn't glued to the chart edges.
  const pad = Math.max(30 * 60 * 1000, (toMs - fromMs) * 0.25);
  let period1 = fromMs - pad;
  let period2 = Math.min(toMs + pad, Date.now());
  if (interval === "1m") {
    // A 1m request must not span more than ~7 days.
    period1 = Math.max(period1, period2 - 6.5 * DAY_MS);
  }

  const chart = await yahooFinance.chart(yahooSymbol, {
    period1: new Date(period1),
    period2: new Date(period2),
    interval,
    includePrePost: true, // fills outside RTH must land on bars
  });

  const candles: Candle[] = [];
  for (const q of chart.quotes ?? []) {
    if (
      q.date &&
      q.open != null &&
      q.high != null &&
      q.low != null &&
      q.close != null
    ) {
      candles.push({
        time: Math.floor(q.date.getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
      });
    }
  }
  return { interval, candles };
}
