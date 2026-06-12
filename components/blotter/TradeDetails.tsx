"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";

import { fmtMoney, fmtQty } from "@/lib/blotter/format";
import type { Trade, TradeFill } from "@/lib/blotter/types";
import { dayKey, enDateMed, fmtTime, type TzMode } from "@/lib/calendar/datetime";
import { fmtPrice } from "@/lib/format";
import { TradeChart } from "./TradeChart";

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
  max-width: 860px;
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
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 18px;
  font-weight: 700;
`;

const DirBadge = styled.span<{ $dir: "long" | "short" }>`
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $dir }) => ($dir === "long" ? theme.colors.green : theme.colors.red)};
  background: ${({ theme, $dir }) =>
    `${$dir === "long" ? theme.colors.green : theme.colors.red}1a`};
  border: 1px solid
    ${({ theme, $dir }) => `${$dir === "long" ? theme.colors.green : theme.colors.red}55`};
`;

const StatusText = styled.span<{ $open: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $open }) => ($open ? theme.colors.accent : theme.colors.muted)};
`;

const Meta = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
`;

const Pnl = styled.div<{ $tone: "green" | "red" | "plain" }>`
  margin-top: 10px;
  color: ${({ theme, $tone }) =>
    $tone === "green" ? theme.colors.green : $tone === "red" ? theme.colors.red : theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 26px;
  font-weight: 700;
`;

const PnlPct = styled.span`
  font-size: 15px;
  margin-left: 8px;
  opacity: 0.85;
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

const BlockTitle = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const FillsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FillRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const FillTime = styled.span`
  color: ${({ theme }) => theme.colors.muted};
`;

const FillDeleteBtn = styled.button`
  appearance: none;
  cursor: pointer;
  margin-left: auto;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 5px;

  &:hover {
    color: ${({ theme }) => theme.colors.red};
    background: ${({ theme }) => `${theme.colors.red}1a`};
  }
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
`;

const MetricBox = styled.div`
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

const MetricValue = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.price};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 15px;
  font-weight: 700;
`;

const NotesArea = styled.textarea`
  width: 100%;
  min-height: 70px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 13px;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

function durationLabel(openedAt: string, closedAt: string | null): string {
  if (!closedAt) return "—";
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  if (ms < 0) return "—";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} ч ${min % 60} мин`;
  return `${Math.floor(h / 24)} дн`;
}

function FillsList({
  title,
  fills,
  tz,
  onDeleteFill,
}: {
  title: string;
  fills: TradeFill[];
  tz: TzMode;
  onDeleteFill: (fillId: string) => void;
}) {
  return (
    <div>
      <BlockTitle>{title}</BlockTitle>
      {fills.length === 0 ? (
        <FillRow as="div">
          <FillTime>—</FillTime>
        </FillRow>
      ) : (
        fills.map((f, i) => (
          <FillRow key={`${f.fillId}-${i}`}>
            <FillTime>{fmtTime(f.executedAt, tz)}</FillTime>
            <span>
              {fmtQty(f.qty)} @ {fmtPrice(f.price)}
            </span>
            <FillDeleteBtn
              type="button"
              aria-label="Удалить исполнение"
              onClick={() => onDeleteFill(f.fillId)}
            >
              ✕
            </FillDeleteBtn>
          </FillRow>
        ))
      )}
    </div>
  );
}

export function TradeDetails({
  trade,
  note,
  tz,
  onClose,
  onSaveNote,
  onDeleteFill,
}: {
  trade: Trade | null;
  note: string;
  tz: TzMode;
  onClose: () => void;
  onSaveNote: (tradeId: string, text: string) => void;
  onDeleteFill: (fillId: string) => void;
}) {
  const [draft, setDraft] = useState(note);

  useEffect(() => setDraft(note), [note, trade?.id]);

  useEffect(() => {
    if (!trade) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trade, onClose]);

  if (!trade) return null;

  const open = trade.status === "open";
  const tone = open || Math.abs(trade.realizedPnl) < 0.001 ? "plain" : trade.realizedPnl > 0 ? "green" : "red";
  const accentColor = trade.direction === "long" ? "#22c55e" : "#ef4444";

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label={`Сделка ${trade.symbol}`}>
      <Dialog $c={accentColor} onClick={(e) => e.stopPropagation()}>
        <Head>
          <HeadMain>
            <Title>
              {trade.symbol}
              <DirBadge $dir={trade.direction}>
                {trade.direction === "long" ? "Long" : "Short"}
              </DirBadge>
              <StatusText $open={open}>{open ? "Открыта" : "Закрыта"}</StatusText>
            </Title>
            <Meta>
              {enDateMed(dayKey(trade.openedAt, tz))} · {fmtTime(trade.openedAt, tz)}
              {trade.closedAt ? ` → ${fmtTime(trade.closedAt, tz)}` : ""}
            </Meta>
            <Pnl $tone={tone}>
              {open ? "Позиция открыта" : fmtMoney(trade.realizedPnl)}
              {!open && (
                <PnlPct>
                  {trade.realizedPnlPct >= 0 ? "+" : ""}
                  {trade.realizedPnlPct.toFixed(2)}%
                </PnlPct>
              )}
            </Pnl>
          </HeadMain>
          <CloseBtn type="button" onClick={onClose} aria-label="Закрыть">
            ✕
          </CloseBtn>
        </Head>

        <Body>
          <TradeChart trade={trade} />

          <FillsGrid>
            <FillsList title="Входы" fills={trade.entries} tz={tz} onDeleteFill={onDeleteFill} />
            <FillsList title="Выходы" fills={trade.exits} tz={tz} onDeleteFill={onDeleteFill} />
          </FillsGrid>

          <div>
            <BlockTitle>Метрики</BlockTitle>
            <MetricGrid>
              <MetricBox>
                <MetricLabel>Сред. вход</MetricLabel>
                <MetricValue>{fmtPrice(trade.avgEntry)}</MetricValue>
              </MetricBox>
              <MetricBox>
                <MetricLabel>Сред. выход</MetricLabel>
                <MetricValue>{trade.avgExit === null ? "—" : fmtPrice(trade.avgExit)}</MetricValue>
              </MetricBox>
              <MetricBox>
                <MetricLabel>Кол-во</MetricLabel>
                <MetricValue>{fmtQty(trade.qtyOpened)}</MetricValue>
              </MetricBox>
              <MetricBox>
                <MetricLabel>Длительность</MetricLabel>
                <MetricValue>{durationLabel(trade.openedAt, trade.closedAt)}</MetricValue>
              </MetricBox>
            </MetricGrid>
          </div>

          <div>
            <BlockTitle>Заметки</BlockTitle>
            <NotesArea
              value={draft}
              placeholder="Что сработало, что нет, эмоции, выводы…"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onSaveNote(trade.id, draft)}
            />
          </div>
        </Body>
      </Dialog>
    </Overlay>
  );
}
