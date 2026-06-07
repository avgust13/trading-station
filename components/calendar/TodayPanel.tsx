"use client";

import styled from "styled-components";

import { dayKey, type TzMode } from "@/lib/calendar/datetime";
import type { MarketEvent } from "@/lib/calendar/types";
import { EventCard } from "./EventCard";
import { MarketBiasPanel } from "./MarketBiasPanel";
import { EmptyState } from "./states";

const Cards = styled.div`
  display: grid;
  gap: 8px;
`;

export function TodayPanel({
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
  const today = events.filter((e) => dayKey(e.startsAt, tz) === todayKey);

  return (
    <div>
      <MarketBiasPanel events={today} tz={tz} />
      {today.length > 0 ? (
        <Cards>
          {today.map((e) => (
            <EventCard key={e.id} event={e} tz={tz} onSelect={onSelect} />
          ))}
        </Cards>
      ) : (
        <EmptyState
          title="На сегодня событий нет"
          hint="Загляни во вкладку «Эта неделя» или «Календарь», чтобы посмотреть ближайшие события."
        />
      )}
    </div>
  );
}
