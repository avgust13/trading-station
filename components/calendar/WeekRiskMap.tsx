"use client";

import styled from "styled-components";

import { dayOfMonth, weekdayOf } from "@/lib/calendar/datetime";
import { dayRisk, RISK_LABELS, riskColor, RISK_RANK } from "@/lib/calendar/insights";
import type { MarketEvent, RiskLevel } from "@/lib/calendar/types";
import { SectionTitle } from "./ui";

const WD_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const LEGEND: RiskLevel[] = ["low", "medium", "high", "extreme"];

const Wrap = styled.div`
  margin-bottom: 20px;
`;

const HeadRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Legend = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
`;

const LegendItem = styled.span<{ $c: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;

  &::before {
    content: "";
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: ${({ $c }) => $c};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Cell = styled.div<{ $c: string; $today: boolean }>`
  border: 1px solid ${({ theme, $today, $c }) => ($today ? $c : theme.colors.border)};
  border-radius: 10px;
  padding: 10px;
  background: ${({ theme }) => theme.colors.zebra};
  min-height: 92px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CellHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const Wd = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Dom = styled.span`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 14px;
  font-weight: 700;
`;

const Bar = styled.div<{ $c: string }>`
  height: 4px;
  border-radius: 999px;
  background: ${({ $c }) => $c};
`;

const RiskText = styled.div<{ $c: string }>`
  color: ${({ $c }) => $c};
  font-size: 11px;
  font-weight: 700;
`;

const TopEvent = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 11.5px;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Count = styled.div`
  margin-top: auto;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`;

function headline(events: MarketEvent[]): string {
  if (events.length === 0) return "";
  const sorted = events
    .slice()
    .sort((a, b) => RISK_RANK[b.importance === "high" ? "high" : b.importance === "medium" ? "medium" : "low"] - RISK_RANK[a.importance === "high" ? "high" : a.importance === "medium" ? "medium" : "low"]);
  return sorted[0].title;
}

export function WeekRiskMap({
  weekKeys,
  byDay,
  todayKey,
}: {
  weekKeys: string[];
  byDay: Map<string, MarketEvent[]>;
  todayKey: string;
}) {
  return (
    <Wrap>
      <HeadRow>
        <SectionTitle>This Week Risk Map</SectionTitle>
      </HeadRow>
      <Legend>
        {LEGEND.map((l) => (
          <LegendItem key={l} $c={riskColor(l)}>
            {RISK_LABELS[l]}
          </LegendItem>
        ))}
      </Legend>
      <Grid>
        {weekKeys.map((key) => {
          const events = byDay.get(key) ?? [];
          const risk = dayRisk(events);
          const color = riskColor(risk);
          return (
            <Cell key={key} $c={color} $today={key === todayKey}>
              <CellHead>
                <Wd>{WD_RU[weekdayOf(key)]}</Wd>
                <Dom>{dayOfMonth(key)}</Dom>
              </CellHead>
              <Bar $c={events.length ? color : "#374151"} />
              {events.length > 0 ? (
                <>
                  <RiskText $c={color}>{RISK_LABELS[risk]}</RiskText>
                  <TopEvent>{headline(events)}</TopEvent>
                  <Count>
                    {events.length} {events.length === 1 ? "событие" : "событий"}
                  </Count>
                </>
              ) : (
                <Count>нет событий</Count>
              )}
            </Cell>
          );
        })}
      </Grid>
    </Wrap>
  );
}
