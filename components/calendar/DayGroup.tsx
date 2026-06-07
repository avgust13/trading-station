"use client";

import styled from "styled-components";

import { ruDayLong, type TzMode } from "@/lib/calendar/datetime";
import { dayRisk, RISK_LABELS, riskColor } from "@/lib/calendar/insights";
import type { MarketEvent } from "@/lib/calendar/types";
import { EventCard } from "./EventCard";

const Wrap = styled.section`
  margin-bottom: 18px;
`;

const Head = styled.div<{ $today: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DayName = styled.div<{ $today: boolean }>`
  color: ${({ theme, $today }) => ($today ? theme.colors.accent : theme.colors.fg)};
  font-size: 14px;
  font-weight: 700;
`;

const TodayTag = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.colors.accent}26`};
  color: ${({ theme }) => theme.colors.accent};
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Spacer = styled.span`
  flex: 1;
`;

const RiskTag = styled.span<{ $c: string }>`
  color: ${({ $c }) => $c};
  font-size: 11px;
  font-weight: 700;
`;

const Cards = styled.div`
  display: grid;
  gap: 8px;
`;

const Empty = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12.5px;
  padding: 2px 0 6px;
`;

export function DayGroup({
  dateKey,
  events,
  tz,
  onSelect,
  today = false,
}: {
  dateKey: string;
  events: MarketEvent[];
  tz: TzMode;
  onSelect: (e: MarketEvent) => void;
  today?: boolean;
}) {
  const risk = dayRisk(events);
  return (
    <Wrap>
      <Head $today={today}>
        <DayName $today={today}>{ruDayLong(dateKey)}</DayName>
        {today && <TodayTag>Сегодня</TodayTag>}
        <Spacer />
        {events.length > 0 && <RiskTag $c={riskColor(risk)}>{RISK_LABELS[risk]}</RiskTag>}
      </Head>
      {events.length > 0 ? (
        <Cards>
          {events.map((e) => (
            <EventCard key={e.id} event={e} tz={tz} onSelect={onSelect} />
          ))}
        </Cards>
      ) : (
        <Empty>Нет важных событий</Empty>
      )}
    </Wrap>
  );
}
