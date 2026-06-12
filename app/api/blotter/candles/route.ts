import { NextResponse } from "next/server";

import { fetchCandles } from "@/lib/blotter/candles";
import { toYahooSymbol } from "@/lib/blotter/symbols";
import type { BlotterApiError, CandleInterval, CandlesResponse } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVALS: CandleInterval[] = ["1m", "5m", "15m", "1h", "1d"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim();
  const from = Date.parse(url.searchParams.get("from") ?? "");
  const to = Date.parse(url.searchParams.get("to") ?? "");
  const intervalParam = url.searchParams.get("interval");

  if (!symbol || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    return NextResponse.json(
      { error: "Нужны параметры symbol, from, to (ISO-даты, from < to)." } satisfies BlotterApiError,
      { status: 400 },
    );
  }

  const forced = INTERVALS.includes(intervalParam as CandleInterval)
    ? (intervalParam as CandleInterval)
    : undefined;
  const yahooSymbol = toYahooSymbol(symbol);

  try {
    const { interval, candles } = await fetchCandles(yahooSymbol, from, to, forced);
    if (candles.length === 0) {
      return NextResponse.json(
        { error: `Нет данных по символу ${symbol}.` } satisfies BlotterApiError,
        { status: 404 },
      );
    }
    return NextResponse.json({ symbol, yahooSymbol, interval, candles } satisfies CandlesResponse);
  } catch (err) {
    console.error(`[error] /api/blotter/candles failed for ${yahooSymbol}:`, err);
    return NextResponse.json(
      { error: `Не удалось загрузить график для ${symbol}.` } satisfies BlotterApiError,
      { status: 502 },
    );
  }
}
