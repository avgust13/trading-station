"use client";

import styled from "styled-components";

import { fmtMoney, fmtQty } from "@/lib/blotter/format";
import type { Trade } from "@/lib/blotter/types";
import { dayKey, enDateMed, fmtTime, type TzMode } from "@/lib/calendar/datetime";
import { fmtPrice } from "@/lib/format";

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th<{ $left?: boolean }>`
  padding: 9px 10px;
  text-align: ${({ $left }) => ($left ? "left" : "right")};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Row = styled.tr`
  cursor: pointer;

  &:nth-child(even) {
    background: ${({ theme }) => theme.colors.zebra};
  }

  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}14`};
  }
`;

const Td = styled.td<{ $tone?: "green" | "red" | "muted"; $left?: boolean }>`
  padding: 9px 10px;
  text-align: ${({ $left }) => ($left ? "left" : "right")};
  color: ${({ theme, $tone }) =>
    $tone === "green"
      ? theme.colors.green
      : $tone === "red"
        ? theme.colors.red
        : $tone === "muted"
          ? theme.colors.muted
          : theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  white-space: nowrap;
`;

const Symbol = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.fg};
`;

const DirBadge = styled.span<{ $dir: "long" | "short" }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $dir }) => ($dir === "long" ? theme.colors.green : theme.colors.red)};
  background: ${({ theme, $dir }) =>
    `${$dir === "long" ? theme.colors.green : theme.colors.red}1a`};
  border: 1px solid
    ${({ theme, $dir }) => `${$dir === "long" ? theme.colors.green : theme.colors.red}55`};
`;

const StatusBadge = styled.span<{ $open: boolean }>`
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $open }) => ($open ? theme.colors.accent : theme.colors.muted)};
`;

const DeleteBtn = styled.button`
  appearance: none;
  cursor: pointer;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;

  &:hover {
    color: ${({ theme }) => theme.colors.red};
    background: ${({ theme }) => `${theme.colors.red}1a`};
  }
`;

const Empty = styled.div`
  padding: 48px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13.5px;
  line-height: 1.7;
`;

function pnlTone(v: number): "green" | "red" | undefined {
  if (v > 0.001) return "green";
  if (v < -0.001) return "red";
  return undefined;
}

export function TradesTable({
  trades,
  tz,
  showExchange,
  exchangeName,
  onSelect,
  onDelete,
}: {
  trades: Trade[];
  tz: TzMode;
  /** Show the "Биржа" column (only meaningful in the "Все" filter). */
  showExchange: boolean;
  exchangeName: (id: string) => string;
  onSelect: (tradeId: string) => void;
  onDelete: (trade: Trade) => void;
}) {
  if (trades.length === 0) {
    return (
      <Wrap>
        <Empty>
          Журнал пуст.
          <br />
          Вставьте скриншот сделок из брокера (Ctrl+V), перетащите файл сюда или нажмите
          «Импорт сделок».
        </Empty>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Table>
        <thead>
          <tr>
            <Th $left>Дата</Th>
            {showExchange && <Th $left>Биржа</Th>}
            <Th $left>Тикер</Th>
            <Th $left>Напр.</Th>
            <Th>Кол-во</Th>
            <Th>Вход (сред.)</Th>
            <Th>Выход (сред.)</Th>
            <Th>P&L</Th>
            <Th>P&L %</Th>
            <Th $left>Статус</Th>
            <Th aria-label="Удалить" />
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const open = t.status === "open";
            return (
              <Row key={t.id} onClick={() => onSelect(t.id)}>
                <Td $left $tone="muted">
                  {enDateMed(dayKey(t.openedAt, tz))} {fmtTime(t.openedAt, tz)}
                </Td>
                {showExchange && (
                  <Td $left $tone="muted">
                    {exchangeName(t.exchangeId)}
                  </Td>
                )}
                <Td $left>
                  <Symbol>{t.symbol}</Symbol>
                </Td>
                <Td $left>
                  <DirBadge $dir={t.direction}>{t.direction === "long" ? "Long" : "Short"}</DirBadge>
                </Td>
                <Td>{fmtQty(t.qtyOpened)}</Td>
                <Td>{fmtPrice(t.avgEntry)}</Td>
                <Td>{t.avgExit === null ? "—" : fmtPrice(t.avgExit)}</Td>
                <Td $tone={open ? "muted" : pnlTone(t.realizedPnl)}>
                  {open ? "—" : fmtMoney(t.realizedPnl)}
                </Td>
                <Td $tone={open ? "muted" : pnlTone(t.realizedPnl)}>
                  {open ? "—" : `${t.realizedPnlPct >= 0 ? "+" : ""}${t.realizedPnlPct.toFixed(2)}%`}
                </Td>
                <Td $left>
                  <StatusBadge $open={open}>{open ? "Открыта" : "Закрыта"}</StatusBadge>
                </Td>
                <Td>
                  <DeleteBtn
                    type="button"
                    aria-label="Удалить сделку"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t);
                    }}
                  >
                    ✕
                  </DeleteBtn>
                </Td>
              </Row>
            );
          })}
        </tbody>
      </Table>
    </Wrap>
  );
}
