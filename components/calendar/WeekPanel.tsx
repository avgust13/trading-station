"use client";

import { type TzMode, weekKeys } from "@/lib/calendar/datetime";
import { groupByDay } from "@/lib/calendar/insights";
import type { MarketEvent } from "@/lib/calendar/types";
import { DayGroup } from "./DayGroup";
import { WeekRiskMap } from "./WeekRiskMap";

export function WeekPanel({
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
  const keys = weekKeys(todayKey);
  const byDay = groupByDay(events, tz);

  return (
    <div>
      <WeekRiskMap weekKeys={keys} byDay={byDay} todayKey={todayKey} />
      {keys.map((key) => (
        <DayGroup
          key={key}
          dateKey={key}
          events={byDay.get(key) ?? []}
          tz={tz}
          onSelect={onSelect}
          today={key === todayKey}
        />
      ))}
    </div>
  );
}
