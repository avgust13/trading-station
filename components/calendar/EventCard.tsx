"use client";

import styled from "styled-components";

import { fmtTime, type TzMode } from "@/lib/calendar/datetime";
import { interpret, surprise, type Tone } from "@/lib/calendar/reactions";
import { COUNTRY_FLAGS, isEarnings, type MarketEvent } from "@/lib/calendar/types";
import { ConfirmationBadge, ImportanceBadge, markerColor, TypeBadge } from "./ui";

const Card = styled.button<{ $c: string }>`
  display: block;
  width: 100%;
  text-align: left;
  appearance: none;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $c }) => $c};
  border-radius: 10px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.zebra};
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;

  &:hover {
    border-color: ${({ $c }) => $c};
    box-shadow: 0 0 0 1px ${({ $c }) => `${$c}55`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Time = styled.span`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  font-weight: 700;
`;

const Flag = styled.span`
  font-size: 14px;
`;

const Spacer = styled.span`
  flex: 1;
`;

const Title = styled.div`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
`;

const Assets = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

const Metrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
`;

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const MLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const MValue = styled.span<{ $accent?: boolean }>`
  color: ${({ theme, $accent }) => ($accent ? theme.colors.fg : theme.colors.price)};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  font-weight: ${({ $accent }) => ($accent ? 700 : 600)};
`;

const Verdict = styled.div<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 5px 10px;
  border-radius: 8px;
  background: ${({ theme, $tone }) => `${toneColor(theme, $tone)}14`};
  border: 1px solid ${({ theme, $tone }) => `${toneColor(theme, $tone)}55`};
  font-size: 12px;
`;

const VerdictLabel = styled.span<{ $tone: Tone }>`
  color: ${({ theme, $tone }) => toneColor(theme, $tone)};
  font-weight: 700;
`;

const VerdictSurprise = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
`;

function toneColor(theme: { colors: { green: string; red: string; muted: string } }, tone: Tone): string {
  return tone === "bull" ? theme.colors.green : tone === "bear" ? theme.colors.red : theme.colors.muted;
}

function MetricCell({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (value === undefined) return null;
  return (
    <Metric>
      <MLabel>{label}</MLabel>
      <MValue $accent={accent}>{value}</MValue>
    </Metric>
  );
}

export function EventCard({
  event,
  tz,
  onSelect,
}: {
  event: MarketEvent;
  tz: TzMode;
  onSelect: (e: MarketEvent) => void;
}) {
  const v = interpret(event);
  const s = isEarnings(event)
    ? surprise(event.epsForecast, event.epsActual)
    : surprise(event.forecast, event.actual);

  return (
    <Card $c={markerColor(event)} type="button" onClick={() => onSelect(event)}>
      <TopRow>
        <Time>{fmtTime(event.startsAt, tz)}</Time>
        <Flag title={event.country}>{COUNTRY_FLAGS[event.country]}</Flag>
        <Spacer />
        <ImportanceBadge importance={event.importance} />
        <TypeBadge type={event.type} />
        <ConfirmationBadge confirmation={event.confirmation} />
      </TopRow>

      <Title>{event.title}</Title>
      <Assets>{event.affectedAssets.join(" · ")}</Assets>

      <Metrics>
        {isEarnings(event) ? (
          <>
            <MetricCell label="EPS est." value={event.epsForecast} />
            <MetricCell label="EPS actual" value={event.epsActual} accent />
            <MetricCell label="Rev est." value={event.revenueForecast} />
            <MetricCell label="Implied move" value={event.impliedMove} />
          </>
        ) : (
          <>
            <MetricCell label="Previous" value={event.previous} />
            <MetricCell label="Forecast" value={event.forecast} />
            <MetricCell label="Actual" value={event.actual} accent />
          </>
        )}
      </Metrics>

      {v && (
        <Verdict $tone={v.tone}>
          <VerdictLabel $tone={v.tone}>{v.label}</VerdictLabel>
          {s && <VerdictSurprise>Surprise {s.display}</VerdictSurprise>}
        </Verdict>
      )}
    </Card>
  );
}
