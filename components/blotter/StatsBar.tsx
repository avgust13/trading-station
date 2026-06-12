"use client";

import styled from "styled-components";

import { fmtMoney } from "@/lib/blotter/format";
import type { BlotterStats } from "@/lib/blotter/stats";

type Tone = "green" | "red" | "plain";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
`;

const Box = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.zebra};
`;

const Label = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Value = styled.div<{ $tone: Tone }>`
  margin-top: 2px;
  color: ${({ theme, $tone }) =>
    $tone === "green" ? theme.colors.green : $tone === "red" ? theme.colors.red : theme.colors.price};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 15px;
  font-weight: 700;
`;

function pnlTone(v: number): Tone {
  if (v > 0.001) return "green";
  if (v < -0.001) return "red";
  return "plain";
}

function Metric({ label, value, tone = "plain" }: { label: string; value: string; tone?: Tone }) {
  return (
    <Box>
      <Label>{label}</Label>
      <Value $tone={tone}>{value}</Value>
    </Box>
  );
}

export function StatsBar({ stats, capital }: { stats: BlotterStats; capital: number }) {
  const returnPct = capital > 0 ? (stats.totalPnl / capital) * 100 : null;
  return (
    <Grid>
      <Metric label="P&L всего" value={fmtMoney(stats.totalPnl)} tone={pnlTone(stats.totalPnl)} />
      <Metric label="P&L сегодня" value={fmtMoney(stats.todayPnl)} tone={pnlTone(stats.todayPnl)} />
      <Metric
        label="P&L % от капитала"
        value={returnPct === null ? "—" : `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
        tone={returnPct === null ? "plain" : pnlTone(returnPct)}
      />
      <Metric
        label="Сделок"
        value={stats.openCount > 0 ? `${stats.tradeCount} + ${stats.openCount} откр.` : String(stats.tradeCount)}
      />
      <Metric
        label="Win rate"
        value={stats.winRate === null ? "—" : `${stats.winRate.toFixed(0)}%`}
      />
      <Metric
        label="Сред. прибыль"
        value={stats.avgWin === null ? "—" : fmtMoney(stats.avgWin)}
        tone={stats.avgWin === null ? "plain" : "green"}
      />
      <Metric
        label="Сред. убыток"
        value={stats.avgLoss === null ? "—" : fmtMoney(stats.avgLoss)}
        tone={stats.avgLoss === null ? "plain" : "red"}
      />
      <Metric
        label="Profit factor"
        value={stats.profitFactor === null ? "—" : stats.profitFactor.toFixed(2)}
      />
    </Grid>
  );
}
