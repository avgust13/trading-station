"use client";

import {
  AreaSeries,
  createChart,
  type IChartApi,
  type IPrimitivePaneRenderer,
  type IPrimitivePaneView,
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
/** Chart background; the hover legend reuses it to mask the quarter labels beneath. */
const BG = "#111827";
/** Q1–Q4 label offset from the pane top, and from its divider / the pane edge, px. */
const LABEL_TOP = 4;
const LABEL_PAD = 4;

type PeriodKind = "quarter" | "month" | "week";

interface Divider {
  /** Last bar of the previous period and first bar of the new one. */
  prev: number;
  next: number;
  kind: PeriodKind;
}

interface DividerStyle {
  lines: Record<PeriodKind, string>;
  /** Canvas font shorthand and color of the Q1–Q4 labels. */
  labelFont: string;
  labelColor: string;
}

/** Monday-based week index (1970-01-01 was a Thursday). */
function weekOf(t: number): number {
  return Math.floor((Math.floor(t / DAY) + 3) / 7);
}

/** Calendar quarter index, unique across years. */
function quarterOf(d: Date): number {
  return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
}

/** "Q1".."Q4" for the quarter a unix time falls in. */
function quarterLabel(t: number): string {
  return `Q${Math.floor(new Date(t * 1000).getUTCMonth() / 3) + 1}`;
}

/** Every quarter / month / week boundary between consecutive bars (the longest period wins). */
function findDividers(points: SparkPoint[]): Divider[] {
  const out: Divider[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].time;
    const b = points[i].time;
    const da = new Date(a * 1000);
    const db = new Date(b * 1000);
    if (quarterOf(da) !== quarterOf(db)) {
      out.push({ prev: a, next: b, kind: "quarter" });
    } else if (da.getUTCMonth() !== db.getUTCMonth()) {
      out.push({ prev: a, next: b, kind: "month" });
    } else if (weekOf(a) !== weekOf(b)) {
      out.push({ prev: a, next: b, kind: "week" });
    }
  }
  return out;
}

/**
 * Hairline vertical dividers behind the area — brightest for quarter starts,
 * dimmer for month starts, faintest for week starts — plus a Q1–Q4 label at the
 * top of each quarter. Each line sits halfway between the last bar of the old
 * period and the first bar of the new one. When zoomed in, a quarter whose start
 * has scrolled off keeps its label pinned to the left edge; a label that no
 * longer fits its quarter's visible width is dropped.
 */
class PeriodDividersPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private readonly dividers: Divider[];

  constructor(
    private readonly points: SparkPoint[],
    private readonly style: DividerStyle,
  ) {
    this.dividers = findDividers(points);
  }

  attached(p: SeriesAttachedParameter<Time>) {
    this.chart = p.chart as IChartApi;
  }
  detached() {
    this.chart = null;
  }
  updateAllViews() {}

  paneViews(): IPrimitivePaneView[] {
    const chart = this.chart;
    if (!chart) return [];
    const ts = chart.timeScale();
    const xOf = (t: number) => ts.timeToCoordinate(t as UTCTimestamp);
    const first = this.points[0].time;
    const last = this.points[this.points.length - 1].time;

    const lines: { x: number; color: string }[] = [];
    // Quarter spans in pane px; the first and last are usually partial quarters.
    const quarters: { from: number; to: number; label: string }[] = [];
    let from: number = xOf(first) ?? -Infinity;
    let label = quarterLabel(first);
    for (const d of this.dividers) {
      const x1 = xOf(d.prev);
      const x2 = xOf(d.next);
      if (x1 == null || x2 == null) continue;
      const x = (x1 + x2) / 2;
      lines.push({ x, color: this.style.lines[d.kind] });
      if (d.kind === "quarter") {
        quarters.push({ from, to: x, label });
        from = x;
        label = quarterLabel(d.next);
      }
    }
    quarters.push({ from, to: xOf(last) ?? Infinity, label });

    const { labelFont, labelColor } = this.style;
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => {
        target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio: hpr }) => {
          const w = Math.max(1, Math.floor(hpr));
          for (const l of lines) {
            ctx.fillStyle = l.color;
            ctx.fillRect(Math.round(l.x * hpr), 0, w, bitmapSize.height);
          }
        });
        target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
          ctx.font = labelFont;
          ctx.fillStyle = labelColor;
          ctx.textBaseline = "top";
          for (const q of quarters) {
            const x = Math.max(q.from, 0) + LABEL_PAD;
            const room = Math.min(q.to, mediaSize.width) - LABEL_PAD - x;
            if (ctx.measureText(q.label).width > room) continue;
            ctx.fillText(q.label, x, LABEL_TOP);
          }
        });
      },
    };
    return [{ zOrder: () => "bottom", renderer: () => renderer }];
  }
}

const Box = styled.div`
  position: relative;
  width: 320px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  background: ${BG};
`;

const ChartHost = styled.div`
  position: absolute;
  inset: 0;
`;

const Legend = styled.div`
  position: absolute;
  top: 3px;
  left: 4px;
  z-index: 2;
  padding: 1px 4px;
  border-radius: 4px;
  background: ${BG};
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
 * 12-month area mini-chart with quarter / month / week divider lines and Q1–Q4
 * labels.
 *
 * Zoom is Ctrl/⌘ + wheel (also trackpad pinch, which browsers report as
 * ctrl+wheel) so plain wheel keeps scrolling the page past the table. Drag
 * pans, double-click resets to the full year.
 */
export function SparkChart({ points }: { points: SparkPoint[] }) {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ time: number; value: number } | null>(null);

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
    // The top margin keeps the line clear of the Q1–Q4 label strip.
    series.priceScale().applyOptions({ scaleMargins: { top: 0.2, bottom: 0.04 } });
    series.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.close })));

    series.attachPrimitive(
      new PeriodDividersPrimitive(points, {
        lines: {
          quarter: `${theme.colors.muted}b3`,
          month: `${theme.colors.muted}59`,
          week: `${theme.colors.accent}1f`,
        },
        labelFont: `600 10px ${theme.fonts.sans}`,
        labelColor: theme.colors.muted,
      }),
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

    ts.fitContent();

    return () => {
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("dblclick", onDblClick);
      chart.remove();
    };
  }, [points, theme]);

  return (
    <Box>
      {hover && (
        <Legend>
          {fmtDate(hover.time)} · {fmtPrice(hover.value)}
        </Legend>
      )}
      <ChartHost ref={hostRef} />
    </Box>
  );
}
