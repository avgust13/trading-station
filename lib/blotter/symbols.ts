import { TICKERS } from "@/lib/tickers";

// Broker ticker → Yahoo Finance symbol. Plain US equities pass through
// unchanged; unknown symbols that Yahoo rejects surface as a 404 from the
// candles route and the chart panel shows a friendly error.

const OVERRIDES: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};

export function toYahooSymbol(brokerSymbol: string): string {
  const s = brokerSymbol.toUpperCase().trim();
  const known = TICKERS.find((t) => t.display === s);
  if (known) return known.yahoo;
  return OVERRIDES[s] ?? s;
}
