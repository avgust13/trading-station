// Pure filtering logic shared by every panel.

import { isEarnings, type CalendarFilters, type MarketEvent } from "./types";

export const defaultFilters: CalendarFilters = {
  countries: [],
  importance: [],
  markets: [],
  assets: [],
  types: [],
  search: "",
};

export function hasActiveFilters(f: CalendarFilters): boolean {
  return (
    f.countries.length > 0 ||
    f.importance.length > 0 ||
    f.markets.length > 0 ||
    f.assets.length > 0 ||
    f.types.length > 0 ||
    f.search.trim().length > 0
  );
}

function overlaps<T>(selected: T[], values: T[]): boolean {
  return selected.length === 0 || values.some((v) => selected.includes(v));
}

function matchesSearch(e: MarketEvent, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    e.title,
    e.country,
    ...e.affectedAssets,
    isEarnings(e) ? e.ticker : "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

/** Apply all active filters; an empty facet means "no constraint". */
export function applyFilters(events: MarketEvent[], f: CalendarFilters): MarketEvent[] {
  return events.filter(
    (e) =>
      (f.countries.length === 0 || f.countries.includes(e.country)) &&
      (f.importance.length === 0 || f.importance.includes(e.importance)) &&
      overlaps(f.markets, e.markets) &&
      overlaps(f.assets, e.affectedAssets) &&
      (f.types.length === 0 || f.types.includes(e.type)) &&
      matchesSearch(e, f.search),
  );
}

/** Toggle a value in a filter array (used by chip buttons). */
export function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
