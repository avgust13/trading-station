"use client";

import styled from "styled-components";

import type { TzMode } from "@/lib/calendar/datetime";
import { groupByDay } from "@/lib/calendar/insights";
import { isEarnings, type MarketEvent } from "@/lib/calendar/types";
import { DayGroup } from "./DayGroup";
import { EventCard } from "./EventCard";
import { EmptyState } from "./states";
import { SectionTitle } from "./ui";

const Block = styled.div`
  margin-bottom: 22px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 8px;
`;

export function EarningsPanel({
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
  const earnings = events.filter(isEarnings);
  if (earnings.length === 0) {
    return (
      <EmptyState
        title="Отчётностей не найдено"
        hint="Сбрось фильтры или загляни в сезон отчётностей (конец июля и конец октября)."
      />
    );
  }

  const featured = earnings.filter((e) => e.featured);
  const byDay = groupByDay(earnings, tz);
  const keys = [...byDay.keys()].sort();

  return (
    <div>
      {featured.length > 0 && (
        <Block>
          <SectionTitle>Featured · mega-cap</SectionTitle>
          <Cards>
            {featured.map((e) => (
              <EventCard key={e.id} event={e} tz={tz} onSelect={onSelect} />
            ))}
          </Cards>
        </Block>
      )}

      <SectionTitle>Все отчётности</SectionTitle>
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
