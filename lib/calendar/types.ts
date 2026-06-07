// Domain model for the Market News Calendar.
// Shared by the data layer (lib/calendar) and the UI (components/calendar).

export type Importance = "high" | "medium" | "low";

export type EventType =
  | "inflation"
  | "jobs"
  | "central_bank"
  | "gdp"
  | "earnings"
  | "crypto"
  | "bonds"
  | "speech"
  | "other";

/** Whether the print has happened yet. */
export type EventStatus = "scheduled" | "released" | "revised";

/** How firm the future date is (raw API often only estimates far-out dates). */
export type Confirmation = "confirmed" | "estimated" | "tentative" | "unknown";

export type Country = "USA" | "EU" | "UK" | "Japan" | "China" | "Global";

export type Market = "forex" | "stocks" | "crypto" | "gold" | "oil" | "bonds";

/** Aggregate risk level for a single day (used by the week heatmap). */
export type RiskLevel = "low" | "medium" | "high" | "extreme";

export interface MarketReaction {
  bullishScenario: string;
  bearishScenario: string;
  neutralScenario: string;
  keyThingsToWatch: string[];
}

export interface MarketEvent {
  id: string;
  title: string;
  /** Canonical instant (ISO UTC). All times are rendered from this in the chosen tz. */
  startsAt: string;
  country: Country;
  importance: Importance;
  type: EventType;
  /** Broad markets the event touches — drives the "Market" filter. */
  markets: Market[];
  /** Concrete tickers/instruments, e.g. "USD", "BTC", "Gold", "Nasdaq". */
  affectedAssets: string[];
  previous?: string;
  forecast?: string;
  actual?: string;
  status: EventStatus;
  confirmation: Confirmation;
  sourceUrl?: string;
  /** Why this event matters (educational). */
  explanation: string;
  reaction: MarketReaction;
}

export interface EarningsEvent extends MarketEvent {
  type: "earnings";
  ticker: string;
  /** Pre-market or after-hours report. */
  session: "pre" | "after";
  epsForecast?: string;
  epsActual?: string;
  revenueForecast?: string;
  revenueActual?: string;
  guidance?: string;
  impliedMove?: string;
  /** Mega-cap highlight (Apple, Nvidia, …). */
  featured?: boolean;
}

export function isEarnings(e: MarketEvent): e is EarningsEvent {
  return e.type === "earnings";
}

export interface CalendarFilters {
  countries: Country[];
  importance: Importance[];
  markets: Market[];
  assets: string[];
  types: EventType[];
  search: string;
}

/* ---------------------------------------------------------------------------
 * Display labels + filter option lists (single source of truth for the UI).
 * ------------------------------------------------------------------------- */

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const TYPE_LABELS: Record<EventType, string> = {
  inflation: "Inflation",
  jobs: "Jobs",
  central_bank: "Central Bank",
  gdp: "GDP",
  earnings: "Earnings",
  crypto: "Crypto",
  bonds: "Bonds",
  speech: "Speeches",
  other: "Other",
};

export const MARKET_LABELS: Record<Market, string> = {
  forex: "Forex",
  stocks: "Stocks",
  crypto: "Crypto",
  gold: "Gold",
  oil: "Oil",
  bonds: "Bonds",
};

export const CONFIRMATION_LABELS: Record<Confirmation, string> = {
  confirmed: "Confirmed",
  estimated: "Estimated",
  tentative: "Tentative",
  unknown: "Unknown",
};

export const COUNTRY_FLAGS: Record<Country, string> = {
  USA: "🇺🇸",
  EU: "🇪🇺",
  UK: "🇬🇧",
  Japan: "🇯🇵",
  China: "🇨🇳",
  Global: "🌐",
};

export const COUNTRY_OPTIONS: Country[] = ["USA", "EU", "UK", "Japan", "China", "Global"];
export const IMPORTANCE_OPTIONS: Importance[] = ["high", "medium", "low"];
export const MARKET_OPTIONS: Market[] = ["forex", "stocks", "crypto", "gold", "oil", "bonds"];
export const TYPE_OPTIONS: EventType[] = [
  "inflation",
  "jobs",
  "central_bank",
  "gdp",
  "earnings",
  "crypto",
  "bonds",
  "speech",
];
/** Common instruments shown as quick asset filters. */
export const ASSET_OPTIONS: string[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "BTC",
  "ETH",
  "Gold",
  "Nasdaq",
  "S&P 500",
  "Oil",
];
