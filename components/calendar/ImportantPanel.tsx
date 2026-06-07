"use client";

import type { TzMode } from "@/lib/calendar/datetime";
import { groupByDay, isHeavyweight } from "@/lib/calendar/insights";
import type { MarketEvent } from "@/lib/calendar/types";
import { DayGroup } from "./DayGroup";
import { EmptyState } from "./states";

export function ImportantPanel({
  events,
  tz,
  todayKey,
  onSelect,
}: {
  events: MarketEvent[];
  tz: TzMode;
  todayKey: string;
  onSelect: (e: MarketEvent) => void;
}) {
  const important = events.filter((e) => e.importance === "high" || isHeavyweight(e));
  if (important.length === 0) {
    return (
      <EmptyState
        title="Важных событий не найдено"
        hint="Здесь показываются high-impact события и тяжеловесы: FOMC, CPI, NFP, PCE, GDP."
      />
    );
  }

  const byDay = groupByDay(important, tz);
  const keys = [...byDay.keys()].sort();

  return (
    <div>
      {keys.map((k) => (
        <DayGroup
          key={k}
          dateKey={k}
          events={byDay.get(k) ?? []}
          tz={tz}
          onSelect={onSelect}
          today={k === todayKey}
        />
      ))}
    </div>
  );
}
