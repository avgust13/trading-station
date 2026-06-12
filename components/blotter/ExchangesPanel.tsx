"use client";

import styled from "styled-components";

import { fmtMoney } from "@/lib/blotter/format";
import type { ExchangeBreakdown } from "@/lib/blotter/stats";

const Wrap = styled.div`
  margin-bottom: 16px;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

const Filter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}22` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.muted)};

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const ManageBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
`;

const Card = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  text-align: left;
  padding: 11px 13px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme }) => theme.colors.zebra};

  &:hover {
    border-color: ${({ theme }) => `${theme.colors.accent}88`};
  }
`;

const CardName = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13.5px;
  font-weight: 700;
`;

const Alloc = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11px;
  font-weight: 600;
`;

const Capital = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.price};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
`;

const PnlRow = styled.div<{ $tone: "green" | "red" | "plain" }>`
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
  color: ${({ theme, $tone }) =>
    $tone === "green" ? theme.colors.green : $tone === "red" ? theme.colors.red : theme.colors.muted};
`;

const Bar = styled.div`
  margin-top: 8px;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${({ theme }) => theme.colors.accent};
`;

const OpenTag = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`;

function tone(v: number): "green" | "red" | "plain" {
  if (v > 0.001) return "green";
  if (v < -0.001) return "red";
  return "plain";
}

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function ExchangesPanel({
  breakdown,
  activeExchangeId,
  onSelect,
  onManage,
}: {
  breakdown: ExchangeBreakdown;
  activeExchangeId: string | "all";
  onSelect: (id: string | "all") => void;
  onManage: () => void;
}) {
  const { rows, total } = breakdown;
  if (rows.length === 0) return null;

  return (
    <Wrap>
      <Top>
        <Filter>
          <FilterBtn $active={activeExchangeId === "all"} onClick={() => onSelect("all")}>
            Все · {fmtMoney(total.totalPnl)}
          </FilterBtn>
          {rows.map((r) => (
            <FilterBtn
              key={r.exchange.id}
              $active={activeExchangeId === r.exchange.id}
              onClick={() => onSelect(r.exchange.id)}
            >
              {r.exchange.name}
            </FilterBtn>
          ))}
        </Filter>
        <ManageBtn type="button" onClick={onManage}>
          ⚙ Биржи
        </ManageBtn>
      </Top>

      <Cards>
        {rows.map((r) => (
          <Card
            key={r.exchange.id}
            $active={activeExchangeId === r.exchange.id}
            onClick={() => onSelect(r.exchange.id)}
          >
            <CardName>
              <span>{r.exchange.name}</span>
              <Alloc>{r.allocationPct === null ? "" : `${r.allocationPct.toFixed(0)}%`}</Alloc>
            </CardName>
            <Capital>Капитал: ${r.capital.toLocaleString("en-US")}</Capital>
            <PnlRow $tone={tone(r.totalPnl)}>
              <span>{fmtMoney(r.totalPnl)}</span>
              <span>{pct(r.returnPct)}</span>
              {r.openCount > 0 && <OpenTag>· {r.openCount} откр.</OpenTag>}
            </PnlRow>
            {r.allocationPct !== null && (
              <Bar>
                <BarFill $pct={r.allocationPct} />
              </Bar>
            )}
          </Card>
        ))}
      </Cards>
    </Wrap>
  );
}
