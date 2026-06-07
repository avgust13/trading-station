"use client";

import styled from "styled-components";

import type { MarketReaction } from "@/lib/calendar/types";

const Wrap = styled.div`
  display: grid;
  gap: 8px;
`;

const Row = styled.div<{ $c: string }>`
  padding: 9px 11px;
  border-radius: 8px;
  border-left: 3px solid ${({ $c }) => $c};
  background: ${({ $c }) => `${$c}12`};
`;

const RowLabel = styled.div<{ $c: string }>`
  color: ${({ $c }) => $c};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 3px;
`;

const RowText = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.5;
`;

const WatchWrap = styled.div`
  margin-top: 4px;
`;

const WatchLabel = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const WatchChip = styled.span`
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 11.5px;
`;

export function MarketReactionHint({ reaction }: { reaction: MarketReaction }) {
  return (
    <Wrap>
      <Row $c="#22c55e">
        <RowLabel $c="#22c55e">Bullish сценарий</RowLabel>
        <RowText>{reaction.bullishScenario}</RowText>
      </Row>
      <Row $c="#ef4444">
        <RowLabel $c="#ef4444">Bearish сценарий</RowLabel>
        <RowText>{reaction.bearishScenario}</RowText>
      </Row>
      <Row $c="#9ca3af">
        <RowLabel $c="#9ca3af">Neutral сценарий</RowLabel>
        <RowText>{reaction.neutralScenario}</RowText>
      </Row>
      {reaction.keyThingsToWatch.length > 0 && (
        <WatchWrap>
          <WatchLabel>Key things to watch</WatchLabel>
          <Chips>
            {reaction.keyThingsToWatch.map((w) => (
              <WatchChip key={w}>{w}</WatchChip>
            ))}
          </Chips>
        </WatchWrap>
      )}
    </Wrap>
  );
}
