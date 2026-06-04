import "server-only";

import YahooFinance from "yahoo-finance2";

import { TICKERS, type Ticker } from "./tickers";
import type { MarketRow } from "./types";

// One shared client. The library queues/throttles requests internally, so the
// parallel fetch below won't hammer Yahoo all at once.
const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  versionCheck: false,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Close {
  date: Date;
  close: number;
}

function eighteenMonthsAgo(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d;
}

/** Format a close date as "Jun 04, 2026" (matches the original Python %b %d, %Y). */
function formatAsOf(d: Date): string {
  const mon = MONTHS[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${mon} ${day}, ${d.getUTCFullYear()}`;
}

/** Last close whose date satisfies `before`, scanning newest -> oldest. */
function lastCloseBefore(closes: Close[], before: (d: Date) => boolean): number | null {
  for (let i = closes.length - 1; i >= 0; i--) {
    if (before(closes[i].date)) return closes[i].close;
  }
  return null;
}

/** ~18 months of daily closes plus the current/live price, from a single chart() call. */
async function fetchChart(yahooSym: string): Promise<{ closes: Close[]; live: number | null } | null> {
  try {
    const chart = await yahooFinance.chart(yahooSym, {
      period1: eighteenMonthsAgo(),
      interval: "1d",
    });

    const closes: Close[] = [];
    for (const q of chart.quotes) {
      if (typeof q.close === "number" && Number.isFinite(q.close)) {
        closes.push({ date: q.date, close: q.close });
      }
    }
    if (closes.length < 2) return null;

    const metaPrice = chart.meta.regularMarketPrice;
    const live = typeof metaPrice === "number" && Number.isFinite(metaPrice) ? metaPrice : null;
    return { closes, live };
  } catch {
    return null;
  }
}

/** Percent change of `value` against `base`, guarding against a zero base. */
function pct(value: number, base: number): number {
  return base ? ((value - base) / base) * 100 : 0;
}

/** Build one market row, mirroring fetch_one() in the original weekly_market_report.py. */
async function fetchOne(t: Ticker): Promise<MarketRow | null> {
  const data = await fetchChart(t.yahoo);
  if (!data) return null;
  const { closes, live } = data;

  const closeLast = closes[closes.length - 1].close;
  const last = live ?? closeLast;
  const prev = closes[closes.length - 2].close;
  // 5 trading days back ≈ one week.
  const weekBack = closes[closes.length >= 6 ? closes.length - 6 : 0].close;

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0-based
  // MTD baseline = last close before the 1st of the current month.
  const beforeMonth = (d: Date) =>
    d.getUTCFullYear() < curYear || (d.getUTCFullYear() === curYear && d.getUTCMonth() < curMonth);
  // YTD baseline = last close before Jan 1 of the current year.
  const beforeYear = (d: Date) => d.getUTCFullYear() < curYear;

  const mtdBase = lastCloseBefore(closes, beforeMonth) ?? last;
  const ytdBase = lastCloseBefore(closes, beforeYear) ?? last;

  return {
    symbol: t.display,
    name: t.name,
    desc: t.desc,
    yest: prev,
    today: last,
    chg: last - prev,
    chg_pct: pct(last, prev),
    wk_pct: pct(last, weekBack),
    mtd_pct: pct(last, mtdBase),
    ytd_pct: pct(last, ytdBase),
    as_of: formatAsOf(closes[closes.length - 1].date),
    price_basis: live != null ? "live" : "close",
  };
}

/**
 * Fetch every ticker in parallel; per-symbol failures are skipped (as the Python
 * try/except did). Rows stay in TICKERS order; `as_of` is the latest one seen.
 */
export async function fetchAll(): Promise<{ rows: MarketRow[]; as_of: string }> {
  const settled = await Promise.allSettled(TICKERS.map((t) => fetchOne(t)));

  const rows: MarketRow[] = [];
  let as_of = "";
  settled.forEach((res, i) => {
    if (res.status === "rejected") {
      console.warn(`[warn] ${TICKERS[i].display} fetch failed:`, res.reason);
      return;
    }
    if (res.value) {
      rows.push(res.value);
      as_of = res.value.as_of;
    }
  });
  return { rows, as_of };
}
