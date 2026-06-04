import type { MarketRow } from "./types";

// Russian descriptions + TradingView symbol mappings, ported verbatim from the
// original index.html. Keyed by display symbol.

export const RU_DESC: Record<string, string> = {
  SPY: 'ETF на индекс S&P 500 — 500 крупнейших публичных компаний США. Главный бенчмарк широкого рынка: задаёт настроение по большим капитализациям и общий риск-аппетит.',
  QQQ: 'ETF на Nasdaq-100 — 100 крупнейших нефинансовых компаний биржи Nasdaq, доминируют технологии (AAPL, MSFT, NVDA). Ростовой и более волатильный аналог SPY; чувствителен к ставкам и ИИ-теме.',
  IWM: 'ETF на Russell 2000 — индекс из ~2000 малых компаний США. Классический индикатор риск-аппетита и здоровья внутренней экономики: при оптимизме обгоняет крупные капиталы.',
  SMH: 'ETF на крупнейшие полупроводниковые компании (NVIDIA, TSMC, ASML, AMD и др.). Главный барометр ИИ-цикла и глобального капекса в технологии; высокая бета к рынку.',
  XBI: 'Равновзвешенный ETF на биотех S&P. Малый и средний биотех — высоковолатильный сегмент, отражает риск-аппетит в здравоохранении и спекулятивный спрос.',
  DIA: 'ETF на Dow Jones Industrial Average — 30 крупнейших промышленных и финансовых "голубых фишек" США. Более защитный и медленный срез рынка, чем SPY.',
  XLF: 'ETF на финансовый сектор S&P 500 — банки, страховщики, биржи, управляющие компании. Чувствителен к кривой доходностей и кредитному циклу.',
  TLT: 'ETF на длинные казначейские облигации США (срок 20+ лет). Растёт при падении долгих доходностей; индикатор ожиданий по ставкам и риск-офф настроениям.',
  XLE: 'ETF на энергетический сектор S&P 500 — нефтегазовые мейджоры, переработчики, нефтесервис. Зависит от цены на нефть и геополитики.',
  XLK: 'ETF на технологический сектор S&P 500 — софт, железо, полупроводники (AAPL, MSFT, NVDA). Главный драйвер роста индекса последних лет.',
  "CL1!": 'Фьючерс на нефть WTI — ближний контракт. Глобальный макроиндикатор инфляции, спроса и геополитического риска.',
  BTC: 'Bitcoin к доллару США. Крупнейшая криптовалюта; высоковолатильный риск-актив, реагирует на ликвидность, ставки и общий риск-аппетит.',
  ETH: 'Ethereum к доллару США. Крупнейший альткоин и основа DeFi/смарт-контрактов; чувствителен к активности экосистемы и общему крипто-настроению.',
};

export const TV_SYMBOL: Record<string, string> = {
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  IWM: "AMEX:IWM",
  SMH: "NASDAQ:SMH",
  XBI: "AMEX:XBI",
  DIA: "AMEX:DIA",
  XLF: "AMEX:XLF",
  TLT: "NASDAQ:TLT",
  XLE: "AMEX:XLE",
  XLK: "AMEX:XLK",
  "CL1!": "TVC:USOIL",
  BTC: "BITSTAMP:BTCUSD",
  ETH: "BITSTAMP:ETHUSD",
};

export function getRuDescription(row: MarketRow): string {
  return RU_DESC[row.symbol] ?? `${row.name}: ${row.desc}`;
}

export function getTvSymbol(row: MarketRow): string {
  return TV_SYMBOL[row.symbol] ?? row.symbol;
}

/** Build the TradingView mini-symbol-overview embed URL for a row. */
export function tradingViewSrc(row: MarketRow): string {
  const config = {
    symbol: getTvSymbol(row),
    width: "100%",
    height: "100%",
    locale: "en",
    dateRange: "12M",
    colorTheme: "dark",
    isTransparent: true,
    autosize: true,
    largeChartUrl: "",
    noTimeScale: false,
    chartOnly: true,
    trendLineColor: "rgba(96, 165, 250, 1)",
    underLineColor: "rgba(96, 165, 250, 0.3)",
    underLineBottomColor: "rgba(96, 165, 250, 0)",
  };
  return `https://s.tradingview.com/embed-widget/mini-symbol-overview/?locale=en#${encodeURIComponent(
    JSON.stringify(config),
  )}`;
}
