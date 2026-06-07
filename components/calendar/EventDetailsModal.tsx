"use client";

import { useEffect } from "react";
import styled from "styled-components";

import { dayKey, enDateMed, fmtTime, tzLabel, type TzMode } from "@/lib/calendar/datetime";
import { interpret, surprise, type Tone } from "@/lib/calendar/reactions";
import { COUNTRY_FLAGS, isEarnings, type MarketEvent } from "@/lib/calendar/types";
import { MarketReactionHint } from "./MarketReactionHint";
import { ConfirmationBadge, ImportanceBadge, markerColor, TypeBadge } from "./ui";

const WATCH_LIST = [
  "Первая 1-минутная свеча после выхода",
  "5-минутное подтверждение направления",
  "Реакция DXY (индекс доллара)",
  "Реакция доходности US10Y",
  "Реакция Nasdaq / S&P 500",
  "Реакция BTC",
  "Liquidity sweep / ложный пробой (false breakout)",
];

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(0, 0, 0, 0.6);
  overflow-y: auto;
`;

const Dialog = styled.div<{ $c: string }>`
  width: 100%;
  max-width: 560px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ $c }) => $c};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeadMain = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
`;

const Meta = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const CloseBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Body = styled.div`
  padding: 16px 18px 20px;
  display: grid;
  gap: 18px;
`;

const Block = styled.div``;

const BlockTitle = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
`;

const MetricBox = styled.div<{ $accent?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.zebra};
`;

const MetricLabel = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const MetricValue = styled.div<{ $accent?: boolean }>`
  margin-top: 2px;
  color: ${({ theme, $accent }) => ($accent ? theme.colors.fg : theme.colors.price)};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 15px;
  font-weight: 700;
`;

const VerdictRow = styled.div<{ $tone: Tone }>`
  margin-top: 10px;
  padding: 8px 11px;
  border-radius: 8px;
  background: ${({ theme, $tone }) =>
    `${$tone === "bull" ? theme.colors.green : $tone === "bear" ? theme.colors.red : theme.colors.muted}14`};
  border: 1px solid ${({ theme, $tone }) =>
    `${$tone === "bull" ? theme.colors.green : $tone === "bear" ? theme.colors.red : theme.colors.muted}55`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.5;

  b {
    color: ${({ theme, $tone }) =>
      $tone === "bull" ? theme.colors.green : $tone === "bear" ? theme.colors.red : theme.colors.fg};
  }
`;

const Para = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13.5px;
  line-height: 1.6;
`;

const WatchList = styled.ul`
  margin: 0;
  padding-left: 18px;
  list-style: disc;
`;

const WatchItem = styled.li`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.6;
`;

const SourceLink = styled.a`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

function MetricBoxCell({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (value === undefined) return null;
  return (
    <MetricBox $accent={accent}>
      <MetricLabel>{label}</MetricLabel>
      <MetricValue $accent={accent}>{value}</MetricValue>
    </MetricBox>
  );
}

export function EventDetailsModal({
  event,
  tz,
  onClose,
}: {
  event: MarketEvent | null;
  tz: TzMode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;

  const v = interpret(event);
  const s = isEarnings(event)
    ? surprise(event.epsForecast, event.epsActual)
    : surprise(event.forecast, event.actual);
  const dateLabel = enDateMed(dayKey(event.startsAt, tz));
  const timeLabel = fmtTime(event.startsAt, tz);

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label={event.title}>
      <Dialog $c={markerColor(event)} onClick={(e) => e.stopPropagation()}>
        <Head>
          <HeadMain>
            <Title>{event.title}</Title>
            <Meta>
              {COUNTRY_FLAGS[event.country]} {event.country} · {dateLabel} · {timeLabel} · {tzLabel(tz)}
            </Meta>
            <Badges>
              <ImportanceBadge importance={event.importance} />
              <TypeBadge type={event.type} />
              <ConfirmationBadge confirmation={event.confirmation} />
            </Badges>
          </HeadMain>
          <CloseBtn type="button" onClick={onClose} aria-label="Закрыть">
            ✕
          </CloseBtn>
        </Head>

        <Body>
          <Block>
            <BlockTitle>Affected assets</BlockTitle>
            <Para>{event.affectedAssets.join(" · ")}</Para>
          </Block>

          <Block>
            <BlockTitle>Данные</BlockTitle>
            <MetricGrid>
              {isEarnings(event) ? (
                <>
                  <MetricBoxCell label="EPS est." value={event.epsForecast} />
                  <MetricBoxCell label="EPS actual" value={event.epsActual} accent />
                  <MetricBoxCell label="Rev est." value={event.revenueForecast} />
                  <MetricBoxCell label="Rev actual" value={event.revenueActual} accent />
                  <MetricBoxCell label="Implied move" value={event.impliedMove} />
                </>
              ) : (
                <>
                  <MetricBoxCell label="Previous" value={event.previous} />
                  <MetricBoxCell label="Forecast" value={event.forecast} />
                  <MetricBoxCell label="Actual" value={event.actual} accent />
                  {s && <MetricBoxCell label="Surprise" value={s.display} accent />}
                </>
              )}
            </MetricGrid>
            {v && (
              <VerdictRow $tone={v.tone}>
                Result: <b>{v.label}</b> — {v.note}
              </VerdictRow>
            )}
            {isEarnings(event) && event.guidance && (
              <VerdictRow $tone="neutral">Guidance: {event.guidance}</VerdictRow>
            )}
          </Block>

          <Block>
            <BlockTitle>Почему это важно</BlockTitle>
            <Para>{event.explanation}</Para>
          </Block>

          <Block>
            <BlockTitle>Возможная реакция</BlockTitle>
            <MarketReactionHint reaction={event.reaction} />
          </Block>

          <Block>
            <BlockTitle>What to watch after release</BlockTitle>
            <WatchList>
              {WATCH_LIST.map((w) => (
                <WatchItem key={w}>{w}</WatchItem>
              ))}
            </WatchList>
          </Block>

          {event.sourceUrl && (
            <Block>
              <BlockTitle>Источник</BlockTitle>
              <SourceLink href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                {event.sourceUrl} ↗
              </SourceLink>
            </Block>
          )}
        </Body>
      </Dialog>
    </Overlay>
  );
}
