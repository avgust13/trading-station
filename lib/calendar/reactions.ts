// Post-release interpretation: parse forecast/actual, compute the surprise, and
// translate it into an educational verdict per event type (sections 14 of the brief).

import { isEarnings, type MarketEvent } from "./types";

export interface Metric {
  /** Numeric value scaled to base units (K/M/B applied). */
  value: number;
  /** Display unit, e.g. "%" or "" for counts. */
  unit: string;
  /** Original string for display. */
  raw: string;
}

const SUFFIX: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** Parse strings like "3.5%", "175K", "-0.2", "$1.2B" into a comparable number. */
export function parseMetric(s?: string | number): Metric | null {
  if (s === undefined || s === null) return null;
  const raw = String(s).trim();
  if (!raw) return null;
  // Strip currency symbols and spaces so "+$1.2B" / "$1.43" parse correctly.
  const cleaned = raw.replace(/[$€£\s]/g, "");
  const m = cleaned.match(/^([+-]?\d+(?:[.,]\d+)?)([%KMBT]?)/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const suf = m[2].toUpperCase();
  const isPct = raw.includes("%");
  const mult = suf && SUFFIX[suf] ? SUFFIX[suf] : 1;
  return { value: num * mult, unit: isPct ? "%" : "", raw };
}

export interface Surprise {
  delta: number;
  /** Percent of the forecast magnitude; NaN if forecast is 0. */
  pct: number;
  unit: string;
  /** Sign-aware display, e.g. "+0.3%" or "-36K". */
  display: string;
}

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n * 100) / 100}`;
}

export function surprise(forecast?: string, actual?: string): Surprise | null {
  const f = parseMetric(forecast);
  const a = parseMetric(actual);
  if (!f || !a) return null;
  const delta = a.value - f.value;
  const pct = f.value !== 0 ? (delta / Math.abs(f.value)) * 100 : NaN;
  const sign = delta > 0 ? "+" : "";
  const display = a.unit === "%" ? `${sign}${delta.toFixed(1)}%` : `${sign}${compact(delta)}`;
  return { delta, pct, unit: a.unit, display };
}

export type Tone = "bull" | "bear" | "neutral";

export interface Verdict {
  /** Short result, e.g. "Hotter than expected", "EPS beat". */
  label: string;
  /** Direction for risk assets (stocks/crypto): bull = supportive. */
  tone: Tone;
  /** One-line educational read-through. */
  note: string;
}

const EPS = 1e-9;

function generic(delta: number): Verdict {
  if (Math.abs(delta) < EPS)
    return { label: "In line with forecast", tone: "neutral", note: "Matched expectations — watch the details and revisions." };
  return delta > 0
    ? { label: "Above forecast", tone: "bull", note: "Came in higher than expected." }
    : { label: "Below forecast", tone: "bear", note: "Came in lower than expected." };
}

function interpretEarnings(e: MarketEvent): Verdict | null {
  if (!isEarnings(e)) return null;
  const eps = surprise(e.epsForecast, e.epsActual);
  const rev = surprise(e.revenueForecast, e.revenueActual);
  if (!eps && !rev) return null;
  const epsBeat = eps ? eps.delta > EPS : false;
  const epsMiss = eps ? eps.delta < -EPS : false;
  const revBeat = rev ? rev.delta > EPS : false;
  const guidanceWeak = /weak|cut|lower|below|disappoint/i.test(e.guidance ?? "");

  if (guidanceWeak && epsBeat)
    return {
      label: "Beat, but weak guidance",
      tone: "bear",
      note: "EPS beat is often outweighed by soft forward guidance.",
    };
  if (epsBeat && revBeat)
    return { label: "EPS & revenue beat", tone: "bull", note: "Top- and bottom-line both ahead of estimates." };
  if (epsBeat) return { label: "EPS beat", tone: "bull", note: "Earnings ahead of estimates." };
  if (epsMiss) return { label: "EPS miss", tone: "bear", note: "Earnings below estimates." };
  return revBeat
    ? { label: "Revenue beat", tone: "bull", note: "Revenue ahead of estimates." }
    : { label: "Revenue miss", tone: "bear", note: "Revenue below estimates." };
}

/**
 * Educational interpretation of a released event. Returns null when there is no
 * actual yet or the values cannot be parsed.
 */
export function interpret(e: MarketEvent): Verdict | null {
  if (e.type === "earnings") return interpretEarnings(e);

  const s = surprise(e.forecast, e.actual);
  if (!s) return null;
  const hotter = s.delta > EPS;
  const cooler = s.delta < -EPS;
  const inline = !hotter && !cooler;
  const t = e.title.toLowerCase();

  if (inline) return { label: "In line with forecast", tone: "neutral", note: "Matched expectations — focus on the internals." };

  switch (e.type) {
    case "inflation":
      return hotter
        ? { label: "Hotter than expected", tone: "bear", note: "Hawkish for Fed expectations — supports USD/yields." }
        : { label: "Cooler than expected", tone: "bull", note: "Dovish read — supportive for risk assets." };

    case "jobs":
      if (t.includes("unemployment"))
        return hotter
          ? { label: "Higher unemployment", tone: "bull", note: "Weaker labor market — may pull rate-cut bets forward." }
          : { label: "Lower unemployment", tone: "bear", note: "Tighter labor market — leans hawkish." };
      if (t.includes("wage") || t.includes("earnings"))
        return hotter
          ? { label: "Hot wage growth", tone: "bear", note: "Wage-driven inflation pressure — hawkish." }
          : { label: "Soft wage growth", tone: "bull", note: "Eases inflation pressure — dovish." };
      // payrolls / ADP / JOLTS
      return hotter
        ? { label: "Stronger labor market", tone: "bear", note: "Fed can stay higher-for-longer — pressure on risk." }
        : { label: "Weaker labor market", tone: "bull", note: "May bring rate-cut expectations forward." };

    case "gdp":
      return hotter
        ? { label: "Stronger economy", tone: "bull", note: "Growth beat — risk-positive unless it stokes rate fears." }
        : { label: "Weaker economy", tone: "bear", note: "Growth miss — raises slowdown concerns." };

    default:
      return generic(s.delta);
  }
}
