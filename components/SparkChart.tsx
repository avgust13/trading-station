"use client";

import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesPrimitive,
  LineStyle,
  type SeriesAttachedParameter,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";

import { fmtPrice } from "@/lib/format";
import type { SparkPoint } from "@/lib/types";

const DAY = 86_400;
/** Narrowest window Ctrl+wheel can zoom into, in bars. */
const MIN_BARS = 10;

interface BitmapScope {
  context: CanvasRenderingContext2D;
  bitmapSize: { width: number; height: number };
  horizontalPixelRatio: number;
}

interface Divider {
  /** Last bar of the previous period and first bar of the new one. */
  prev: number;
  next: number;
  kind: "month" | "week";
}

/** Monday-based week index (1970-01-01 was a Thursday). */
function weekOf(t: number): number {
  return Math.floor((Math.floor(t / DAY) + 3) / 7);
}

/** Every month / week boundary between consecutive bars (month wins when both change). */
function findDividers(points: SparkPoint[]): Divider[] {
  const out: Divider[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].time;
    const b = points[i].time;
    const da = new Date(a * 1000);
    const db = new Date(b * 1000);
    if (da.getUTCMonth() !== db.getUTCMonth() || da.getUTCFullYear() !== db.getUTCFullYear()) {
      out.push({ prev: a, next: b, kind: "month" });
    } else if (weekOf(a) !== weekOf(b)) {
      out.push({ prev: a, next: b, kind: "week" });
    }
  }
  return out;
}

/**
 * Hairline vertical dividers behind the area: one color for month starts, a
 * fainter one for week starts. Each line sits halfway between the last bar of
 * the old period and the first bar of the new one.
 */
class PeriodDividersPrimitive {
  private chart: IChartApi | null = null;

  constructor(
    private readonly dividers: Divider[],
    private readonly colors: { month: string; week: string },
  ) {}

  attached(p: SeriesAttachedParameter<Time>) {
    this.chart = p.chart as IChartApi;
  }
  detached() {
    this.chart = null;
  }
  updateAllViews() {}

  paneViews() {
    const chart = this.chart;
    if (!chart) return [];
    const ts = chart.timeScale();
    const lines: { x: number; color: string }[] = [];
    for (const d of this.dividers) {
      const x1 = ts.timeToCoordinate(d.prev as UTCTimestamp);
      const x2 = ts.timeToCoordinate(d.next as UTCTimestamp);
      if (x1 == null || x2 == null) continue;
      lines.push({ x: (x1 + x2) / 2, color: d.kind === "month" ? this.colors.month : this.colors.week });
    }

    const renderer = {
      draw: (target: { useBitmapCoordinateSpace(cb: (s: BitmapScope) => void): void }) => {
        target.useBitmapCoordinateSpace((scope) => {
          const ctx = scope.context;
          const w = Math.max(1, Math.floor(scope.horizontalPixelRatio));
          for (const l of lines) {
            ctx.fillStyle = l.color;
            ctx.fillRect(Math.round(l.x * scope.horizontalPixelRatio), 0, w, scope.bitmapSize.height);
          }
        });
      },
    };
    return [{ zOrder: () => "bottom" as const, renderer: () => renderer }];
  }
}

const Box = styled.div`
  position: relative;
  width: 320px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  background: #111827;
`;

const ChartHost = styled.div`
  position: absolute;
  inset: 0;
`;

const ResetButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => `${theme.colors.accent}33`};
  transition: background 120ms ease;

  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}4d`};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`;

const Legend = styled.div`
  position: absolute;
  top: 5px;
  left: 8px;
  z-index: 2;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

function fmtDate(t: number): string {
  return new Date(t * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * 12-month area mini-chart with month / week divider lines.
 *
 * Zoom is Ctrl/⌘ + wheel (also trackpad pinch, which browsers report as
 * ctrl+wheel) so plain wheel keeps scrolling the page past the table. Drag
 * pans, double-click or the corner button resets to the full year.
 */
export function SparkChart({ points }: { points: SparkPoint[] }) {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hover, setHover] = useState<{ time: number; value: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || points.length < 2) return;

    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: theme.colors.muted,
        fontFamily: theme.fonts.sans,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false, axisDoubleClickReset: false },
      crosshair: {
        horzLine: { visible: false, labelVisible: false },
        vertLine: {
          color: `${theme.colors.muted}80`,
          style: LineStyle.Solid,
          width: 1,
          labelVisible: false,
        },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: theme.colors.accent,
      topColor: `${theme.colors.accent}4d`,
      bottomColor: `${theme.colors.accent}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 3,
    });
    series.priceScale().applyOptions({ scaleMargins: { top: 0.12, bottom: 0.04 } });
    series.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.close })));

    series.attachPrimitive(
      new PeriodDividersPrimitive(findDividers(points), {
        month: `${theme.colors.muted}59`,
        week: `${theme.colors.accent}1f`,
      }) as unknown as ISeriesPrimitive<Time>,
    );

    chart.subscribeCrosshairMove((param) => {
      const v = param.seriesData.get(series) as { value?: number } | undefined;
      if (v && typeof v.value === "number" && typeof param.time === "number") {
        setHover({ time: param.time, value: v.value });
      } else {
        setHover(null);
      }
    });

    const ts = chart.timeScale();
    const last = points.length - 1;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const lines = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 33 : 1;
      const factor = Math.exp(e.deltaY * lines * 0.002);
      const anchor =
        ts.coordinateToLogical(e.clientX - host.getBoundingClientRect().left) ?? (range.from + range.to) / 2;
      let from = anchor - (anchor - range.from) * factor;
      let to = anchor + (range.to - anchor) * factor;
      if (to - from < MIN_BARS) {
        const k = MIN_BARS / (to - from);
        from = anchor - (anchor - from) * k;
        to = anchor + (to - anchor) * k;
      }
      ts.setVisibleLogicalRange({ from: Math.max(0, from), to: Math.min(last, to) });
    };
    const onDblClick = () => ts.fitContent();
    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("dblclick", onDblClick);

    ts.subscribeVisibleLogicalRangeChange((r) => setZoomed(!!r && r.to - r.from < last - 1));

    ts.fitContent();
    chartRef.current = chart;

    return () => {
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("dblclick", onDblClick);
      chartRef.current = null;
      setZoomed(false);
      chart.remove();
    };
  }, [points, theme]);

  return (
    <Box>
      {zoomed && (
        <ResetButton
          type="button"
          title="Сбросить масштаб"
          aria-label="Сбросить масштаб"
          onClick={() => chartRef.current?.timeScale().fitContent()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </ResetButton>
      )}
      {hover && (
        <Legend>
          {fmtDate(hover.time)} · {fmtPrice(hover.value)}
        </Legend>
      )}
      <ChartHost ref={hostRef} />
    </Box>
  );
}
