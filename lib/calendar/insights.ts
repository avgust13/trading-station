// Derived, educational insights over a set of events: per-day risk level, asset
// exposure and day grouping. Used by the Market Bias panel and Week Risk Map.

import { dayKey, type TzMode } from "./datetime";
import type { MarketEvent, RiskLevel } from "./types";

const HEAVY = /CPI|Nonfarm|Payroll|FOMC|PCE|Rate Decision|GDP/i;

/** Top-tier market movers that warrant an "extreme" rating when stacked. */
export function isHeavyweight(e: MarketEvent): boolean {
  return HEAVY.test(e.title);
}

/** Aggregate risk for a single day's events. */
export function dayRisk(events: MarketEvent[]): RiskLevel {
  const highs = events.filter((e) => e.importance === "high").length;
  const meds = events.filter((e) => e.importance === "medium").length;
  if (highs >= 2 && events.some(isHeavyweight)) return "extreme";
  if (highs >= 1) return "high";
  if (meds >= 1) return "medium";
  return "low";
}

export const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, extreme: 3 };

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  extreme: "Extreme risk",
};

export const RISK_LABELS_RU: Record<RiskLevel, string> = {
  low: "низкая важность",
  medium: "средняя важность",
  high: "высокая важность",
  extreme: "экстремальный риск",
};

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "#22c55e";
    case "medium":
      return "#f59e0b";
    case "high":
      return "#ef4444";
    case "extreme":
      return "#f43f5e";
  }
}

/** Most frequently affected assets across the events, most-common first. */
export function topAssets(events: MarketEvent[], n = 6): string[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const a of e.affectedAssets) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([asset]) => asset);
}

/** Group events by their day key in the given timezone (input order preserved). */
export function groupByDay(events: MarketEvent[], tz: TzMode): Map<string, MarketEvent[]> {
  const map = new Map<string, MarketEvent[]>();
  for (const e of events) {
    const k = dayKey(e.startsAt, tz);
    const bucket = map.get(k);
    if (bucket) bucket.push(e);
    else map.set(k, [e]);
  }
  return map;
}
