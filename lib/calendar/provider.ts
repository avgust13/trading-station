// Abstract events source. The UI only ever talks to `provider.getEvents(range)`,
// so swapping mock data for a real API later (Trading Economics, Finnhub,
// CoinMarketCal, …) is a one-line change here — the components don't change.

import { mockEvents } from "./mock-events";
import type { MarketEvent } from "./types";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface EventsProvider {
  getEvents(range: DateRange): Promise<MarketEvent[]>;
}

/** Reads from the bundled mock dataset. */
export const mockProvider: EventsProvider = {
  async getEvents(range) {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    return mockEvents
      .filter((e) => {
        const t = new Date(e.startsAt).getTime();
        return t >= startMs && t <= endMs;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
};

// Future: an httpProvider hitting /api/calendar?from=..&to=.. in the style of
// lib/api.ts. Swap the export below to switch the whole app over.
//
// export const httpProvider: EventsProvider = {
//   async getEvents({ start, end }) {
//     const res = await fetch(`/api/calendar?from=${start.toISOString()}&to=${end.toISOString()}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     return (await res.json()) as MarketEvent[];
//   },
// };

/** Single swap point for the active data source. */
export const provider: EventsProvider = mockProvider;
