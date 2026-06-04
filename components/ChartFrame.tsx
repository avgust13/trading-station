"use client";

import styled from "styled-components";

import { tradingViewSrc } from "@/lib/display";
import type { MarketRow } from "@/lib/types";

const Frame = styled.iframe`
  width: 320px;
  height: 110px;
  border: 0;
  border-radius: 8px;
  display: block;
  background: #111827;
`;

/** Embedded TradingView mini-chart for a row. */
export function ChartFrame({ row }: { row: MarketRow }) {
  return (
    <Frame
      title={`${row.symbol} TradingView daily chart`}
      loading="lazy"
      src={tradingViewSrc(row)}
    />
  );
}
