// The curated instrument list. `display` is what the UI shows; `yahoo` is the
// symbol passed to yahoo-finance2.

export interface Ticker {
  /** Symbol shown in the UI. */
  display: string;
  /** Yahoo Finance symbol used for data fetching. */
  yahoo: string;
  /** Human-readable instrument name. */
  name: string;
  /** Tooltip description. */
  desc: string;
}

export const TICKERS: Ticker[] = [
  { display: "SPY", yahoo: "SPY", name: "SPDR S&P 500 ETF", desc: "Tracks the S&P 500 — the 500 largest US companies. Broad large-cap benchmark." },
  { display: "QQQ", yahoo: "QQQ", name: "Invesco QQQ Trust", desc: "Tracks the Nasdaq-100 — 100 largest non-financial Nasdaq names. Tech-heavy growth proxy." },
  { display: "IWM", yahoo: "IWM", name: "iShares Russell 2000 ETF", desc: "Tracks the Russell 2000 — small-cap US stocks. Classic risk-on / risk-off tell." },
  { display: "SMH", yahoo: "SMH", name: "VanEck Semiconductor ETF", desc: "25 largest semiconductor companies. Key AI / cyclical-growth barometer." },
  { display: "XBI", yahoo: "XBI", name: "SPDR S&P Biotech ETF", desc: "Equal-weighted biotech basket. High-beta speculative health gauge." },
  { display: "DIA", yahoo: "DIA", name: "SPDR Dow Jones Industrial Avg ETF", desc: "Tracks the Dow 30 — 30 US blue-chip industrials/financials." },
  { display: "XLF", yahoo: "XLF", name: "Financial Select Sector SPDR", desc: "S&P 500 financials — banks, insurers, asset managers, exchanges." },
  { display: "TLT", yahoo: "TLT", name: "iShares 20+ Year Treasury Bond ETF", desc: "Long-dated US Treasuries. Moves inverse to long-end yields." },
  { display: "XLE", yahoo: "XLE", name: "Energy Select Sector SPDR", desc: "S&P 500 energy — oil & gas majors, refiners, services." },
  { display: "XLK", yahoo: "XLK", name: "Technology Select Sector SPDR", desc: "S&P 500 tech — software, hardware, semis." },
  { display: "CL1!", yahoo: "CL=F", name: "WTI Crude Oil — front-month future", desc: "West Texas Intermediate crude futures, front month. Global energy macro tell." },
  { display: "BTC", yahoo: "BTC-USD", name: "Bitcoin (USD spot)", desc: "Bitcoin price in US dollars." },
  { display: "ETH", yahoo: "ETH-USD", name: "Ethereum (USD spot)", desc: "Ethereum price in US dollars." },
];
