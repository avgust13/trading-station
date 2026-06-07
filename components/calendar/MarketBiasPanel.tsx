"use client";

import styled from "styled-components";

import { fmtTime, type TzMode } from "@/lib/calendar/datetime";
import { dayRisk, isHeavyweight, RISK_LABELS, riskColor, topAssets } from "@/lib/calendar/insights";
import type { MarketEvent } from "@/lib/calendar/types";

const Wrap = styled.div<{ $c: string }>`
  border: 1px solid ${({ $c }) => `${$c}55`};
  border-left: 3px solid ${({ $c }) => $c};
  border-radius: 12px;
  padding: 14px 16px;
  background: ${({ $c }) => `${$c}10`};
  margin-bottom: 18px;
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Title = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 15px;
  font-weight: 700;
`;

const RiskPill = styled.span<{ $c: string }>`
  padding: 2px 10px;
  border-radius: 999px;
  background: ${({ $c }) => `${$c}26`};
  border: 1px solid ${({ $c }) => `${$c}77`};
  color: ${({ $c }) => $c};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Summary = styled.p`
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.55;
`;

const SubLabel = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
`;

const EventLine = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.6;

  span {
    color: ${({ theme }) => theme.colors.muted};
    font-family: ${({ theme }) => theme.fonts.mono};
    margin-right: 8px;
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const AssetChip = styled.span`
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12px;
`;

const Recommendation = styled.div`
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid ${({ theme }) => `${theme.colors.accent}55`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.55;
`;

export function MarketBiasPanel({ events, tz }: { events: MarketEvent[]; tz: TzMode }) {
  const risk = dayRisk(events);
  const color = riskColor(risk);
  const keyEvents = events
    .filter((e) => e.importance !== "low")
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const assets = topAssets(events, 6);
  const heavy = events.some(isHeavyweight);

  const summary =
    events.length === 0
      ? "Сегодня нет значимых запланированных событий. Низкая вероятность новостной волатильности — основное внимание на технику и текущий тренд."
      : risk === "extreme" || risk === "high"
        ? "Сегодня высокий риск волатильности. Возможны резкие движения вокруг публикаций — закладывай более широкие стопы и меньший размер позиции."
        : risk === "medium"
          ? "Сегодня умеренный риск. Есть события среднего значения — следи за реакцией на публикации."
          : "Сегодня спокойный фон: события низкой важности, резкие движения менее вероятны.";

  const recommendation = heavy
    ? "Не открывай крупные позиции за 15–30 минут до ключевой публикации. После выхода данных дождись первой реакции и закрепления цены выше/ниже ключевых уровней. Это образовательный обзор, а не торговая рекомендация."
    : "Следи за реакцией на публикации и за ключевыми уровнями. Это образовательный обзор, а не торговая рекомендация.";

  return (
    <Wrap $c={color}>
      <HeadRow>
        <Title>Today&apos;s Market Bias</Title>
        <RiskPill $c={color}>{RISK_LABELS[risk]}</RiskPill>
      </HeadRow>

      <Summary>{summary}</Summary>

      {keyEvents.length > 0 && (
        <>
          <SubLabel>Главные события</SubLabel>
          {keyEvents.map((e) => (
            <EventLine key={e.id}>
              <span>{fmtTime(e.startsAt, tz)}</span>
              {e.title}
            </EventLine>
          ))}
        </>
      )}

      {assets.length > 0 && (
        <>
          <SubLabel>Рынки под риском</SubLabel>
          <Chips>
            {assets.map((a) => (
              <AssetChip key={a}>{a}</AssetChip>
            ))}
          </Chips>
        </>
      )}

      <Recommendation>{recommendation}</Recommendation>
    </Wrap>
  );
}
