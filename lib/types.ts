// Types shared by the API route (app/api) and the React UI (components/).

/** One computed market row, as returned by GET /api/data. */
export interface MarketRow {
  /** Display symbol (e.g. "SPY", "CL1!"). */
  symbol: string;
  /** Human-readable instrument name. */
  name: string;
  /** Tooltip description. */
  desc: string;
  /** Previous close. */
  yest: number;
  /** Latest price — live quote when available, otherwise the latest close. */
  today: number;
  /** Absolute daily change (today - yest). */
  chg: number;
  /** Daily percent change. */
  chg_pct: number;
  /** Weekly percent change (~last 5 trading days). */
  wk_pct: number;
  /** Month-to-date percent change. */
  mtd_pct: number;
  /** Year-to-date percent change. */
  ytd_pct: number;
  /** Date label of the latest close (e.g. "Jun 04, 2026"). */
  as_of: string;
  /** Whether `today` came from a live quote or the latest close. */
  price_basis: "live" | "close";
}

/** Success payload of GET /api/data. */
export interface ApiData {
  as_of: string;
  rows: MarketRow[];
  source: "live";
}

/** Error payload (e.g. HTTP 502 from GET /api/data). */
export interface ApiError {
  error: string;
}
