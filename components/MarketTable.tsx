"use client";

import styled from "styled-components";

import type { MarketRow as Row } from "@/lib/types";
import { MarketRow } from "./MarketRow";

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  background: ${({ theme }) => theme.colors.bg};
  table-layout: fixed;
`;

const Th = styled.th<{ $left?: boolean }>`
  padding: 12px;
  text-align: ${({ $left }) => ($left ? "left" : "right")};
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.sans};
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.bg};
  z-index: 5;
`;

const Tbody = styled.tbody`
  tr:nth-child(odd) td {
    background: ${({ theme }) => theme.colors.zebra};
  }
`;

// Russian headers, preserved from the original index.html.
const HEADERS: { label: string; left?: boolean }[] = [
  { label: "Тикер", left: true },
  { label: "Вчера" },
  { label: "Сегодня" },
  { label: "Изм." },
  { label: "Изм. %" },
  { label: "Неделя %" },
  { label: "MTD %" },
  { label: "YTD %" },
  { label: "График D", left: true },
];

export function MarketTable({ rows }: { rows: Row[] }) {
  return (
    <Table>
      <colgroup>
        <col />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "340px" }} />
      </colgroup>
      <thead>
        <tr>
          {HEADERS.map((h) => (
            <Th key={h.label} $left={h.left}>
              {h.label}
            </Th>
          ))}
        </tr>
      </thead>
      <Tbody>
        {rows.map((row) => (
          <MarketRow key={row.symbol} row={row} />
        ))}
      </Tbody>
    </Table>
  );
}
