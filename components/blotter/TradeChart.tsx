"use client";

import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  LineStyle,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";

import { fmtQty } from "@/lib/blotter/format";
import type { BlotterApiError, CandlesResponse, Trade } from "@/lib/blotter/types";

const INTERVAL_SEC: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

const Box = styled.div`
  position: relative;
  height: 320px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.zebra};
`;

const ChartHost = styled.div`
  position: absolute;
  inset: 0;
`;

const Note = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

const IntervalTag = styled.div`
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 2;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11px;
`;

/** Snap a fill instant to the time of an existing candle (Yahoo has gaps). */
function snapToBar(fillSec: number, intervalSec: number, barTimes: number[]): number {
  const target = Math.floor(fillSec / intervalSec) * intervalSec;
  // Last bar at-or-before the target (binary search).
  let lo = 0;
  let hi = barTimes.length - 1;
  let best = barTimes[0];
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (barTimes[mid] <= target) {
      best = barTimes[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function TradeChart({ trade }: { trade: Trade }) {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CandlesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    const from = trade.openedAt;
    const to = trade.closedAt ?? new Date().toISOString();
    const params = new URLSearchParams({ symbol: trade.symbol, from, to });
    fetch(`/api/blotter/candles?${params.toString()}`)
      .then(async (res) => {
        const body = (await res.json()) as CandlesResponse | BlotterApiError;
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          setError("error" in body ? body.error : "График недоступен.");
        } else {
          setData(body);
        }
      })
      .catch(() => {
        if (!cancelled) setError("График недоступен.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trade.symbol, trade.openedAt, trade.closedAt]);

  useEffect(() => {
    if (!data || !hostRef.current) return;

    const chart = createChart(hostRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: theme.colors.muted,
        fontFamily: theme.fonts.sans,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: theme.colors.border },
        horzLines: { color: theme.colors.border },
      },
      rightPriceScale: { borderColor: theme.colors.border },
      timeScale: {
        borderColor: theme.colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: theme.colors.green,
      downColor: theme.colors.red,
      wickUpColor: theme.colors.green,
      wickDownColor: theme.colors.red,
      borderVisible: false,
    });

    series.setData(
      data.candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    const intervalSec = INTERVAL_SEC[data.interval] ?? 60;
    const barTimes = data.candles.map((c) => c.time);
    const fills = [...trade.entries, ...trade.exits];
    const markers: SeriesMarker<Time>[] = fills
      .map((f) => {
        const sec = Math.floor(new Date(f.executedAt).getTime() / 1000);
        const buy = f.side === "buy";
        return {
          time: snapToBar(sec, intervalSec, barTimes) as UTCTimestamp,
          position: buy ? ("belowBar" as const) : ("aboveBar" as const),
          color: buy ? theme.colors.green : theme.colors.red,
          shape: buy ? ("arrowUp" as const) : ("arrowDown" as const),
          text: `${buy ? "Buy" : "Sell"} ${fmtQty(f.qty)} @ ${f.price}`,
        };
      })
      .sort((a, b) => Number(a.time) - Number(b.time));
    createSeriesMarkers(series, markers);

    series.createPriceLine({
      price: trade.avgEntry,
      color: theme.colors.accent,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      title: `Вход ${trade.avgEntry.toFixed(2)}`,
    });
    if (trade.avgExit !== null) {
      series.createPriceLine({
        price: trade.avgExit,
        color: trade.realizedPnl >= 0 ? theme.colors.green : theme.colors.red,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        title: `Выход ${trade.avgExit.toFixed(2)}`,
      });
    }

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, trade, theme]);

  return (
    <Box>
      {data && <IntervalTag>{data.symbol} · {data.interval}</IntervalTag>}
      <ChartHost ref={hostRef} />
      {loading && <Note>Загрузка графика…</Note>}
      {error && <Note>{error}</Note>}
    </Box>
  );
}
