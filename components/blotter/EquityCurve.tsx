"use client";

import {
  BaselineSeries,
  createChart,
  type IChartApi,
  LineStyle,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";

import { fmtMoney } from "@/lib/blotter/format";
import { buildEquityCurve } from "@/lib/blotter/stats";
import type { Trade } from "@/lib/blotter/types";

type Period = "all" | "1m" | "3m" | "ytd" | "1y";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "Всё" },
  { key: "1m", label: "1М" },
  { key: "3m", label: "3М" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Г" },
];

const DAY = 86_400;

const Wrap = styled.div`
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 14px;
  background: ${({ theme }) => theme.colors.zebra};
`;

const Top = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const Summary = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`;

const AccountValue = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 18px;
  font-weight: 700;
`;

const PnlTag = styled.span<{ $tone: "green" | "red" | "plain" }>`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === "green" ? theme.colors.green : $tone === "red" ? theme.colors.red : theme.colors.muted};
`;

const Chips = styled.div`
  display: flex;
  gap: 6px;
`;

const Chip = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}22` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.muted)};

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Box = styled.div`
  position: relative;
  height: 260px;
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

const Legend = styled.div`
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 2;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11.5px;
`;

function tone(v: number): "green" | "red" | "plain" {
  if (v > 0.001) return "green";
  if (v < -0.001) return "red";
  return "plain";
}

/** Start of the selected period, in unix seconds, or null for "all". */
function periodStart(period: Period, now: Date): number | null {
  const nowSec = Math.floor(now.getTime() / 1000);
  switch (period) {
    case "1m":
      return nowSec - 30 * DAY;
    case "3m":
      return nowSec - 91 * DAY;
    case "1y":
      return nowSec - 365 * DAY;
    case "ytd":
      return Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000);
    default:
      return null;
  }
}

export function EquityCurve({ trades, capital }: { trades: Trade[]; capital: number }) {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [hover, setHover] = useState<{ value: number; time: number } | null>(null);

  const points = useMemo(() => buildEquityCurve(trades, capital), [trades, capital]);
  const lastValue = points.length > 0 ? points[points.length - 1].value : capital;
  const totalPnl = lastValue - capital;

  // Build the chart + series whenever the data, baseline or theme changes.
  useEffect(() => {
    if (points.length === 0 || !hostRef.current) return;

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
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: { horzLine: { visible: true }, vertLine: { visible: true } },
    });
    chartRef.current = chart;

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: capital },
      topLineColor: theme.colors.green,
      topFillColor1: `${theme.colors.green}55`,
      topFillColor2: `${theme.colors.green}0d`,
      bottomLineColor: theme.colors.red,
      bottomFillColor1: `${theme.colors.red}0d`,
      bottomFillColor2: `${theme.colors.red}55`,
      lineWidth: 2,
    });
    series.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    series.createPriceLine({
      price: capital,
      color: theme.colors.muted,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      title: "Депозит",
    });

    chart.subscribeCrosshairMove((param) => {
      const v = param.seriesData.get(series) as { value?: number } | undefined;
      if (v && typeof v.value === "number" && typeof param.time === "number") {
        setHover({ value: v.value, time: param.time });
      } else {
        setHover(null);
      }
    });

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [points, capital, theme]);

  // Zoom to the selected period without recreating the chart.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || points.length === 0) return;
    const ts = chart.timeScale();
    const from = periodStart(period, new Date());
    if (from === null) {
      ts.fitContent();
      return;
    }
    const dataFrom = points[0].time;
    const dataTo = points[points.length - 1].time;
    const clampedFrom = Math.max(dataFrom, Math.min(from, dataTo - 1));
    try {
      ts.setVisibleRange({
        from: clampedFrom as UTCTimestamp,
        to: dataTo as UTCTimestamp,
      });
    } catch {
      ts.fitContent();
    }
  }, [period, points]);

  const shown = hover ?? { value: lastValue, time: points[points.length - 1]?.time ?? 0 };
  const shownPnl = shown.value - capital;

  return (
    <Wrap>
      <Top>
        <Summary>
          <AccountValue>Счёт: ${lastValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</AccountValue>
          <PnlTag $tone={tone(totalPnl)}>
            {fmtMoney(totalPnl)}
            {capital > 0 ? ` · ${totalPnl >= 0 ? "+" : ""}${((totalPnl / capital) * 100).toFixed(2)}%` : ""}
          </PnlTag>
        </Summary>
        <Chips>
          {PERIODS.map((p) => (
            <Chip key={p.key} $active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </Chip>
          ))}
        </Chips>
      </Top>
      <Box>
        {points.length === 0 ? (
          <Note>Нет закрытых сделок для графика</Note>
        ) : (
          <>
            <Legend>
              {new Date(shown.time * 1000).toLocaleDateString("ru-RU")} · $
              {shown.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} · {fmtMoney(shownPnl)}
            </Legend>
            <ChartHost ref={hostRef} />
          </>
        )}
      </Box>
    </Wrap>
  );
}
