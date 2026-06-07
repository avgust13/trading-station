// Mock dataset for the Market News Calendar.
//
// Centred on the current week (today ≈ 2026-06-07) and spread out to the end of
// 2026: a realistic recurring schedule (CPI monthly, NFP first Friday, FOMC ~8/yr,
// Core PCE month-end, ECB, mega-cap earnings quarterly, crypto events). A few
// already-released prints carry `actual` values so the surprise/verdict UI has
// something to show. Replace this module with a real API behind provider.ts.

import type {
  Confirmation,
  Country,
  EarningsEvent,
  EventType,
  Importance,
  Market,
  MarketEvent,
  MarketReaction,
} from "./types";

/* ---------------------------------------------------------------------------
 * Builders
 * ------------------------------------------------------------------------- */

function reaction(
  bullishScenario: string,
  bearishScenario: string,
  neutralScenario: string,
  keyThingsToWatch: string[],
): MarketReaction {
  return { bullishScenario, bearishScenario, neutralScenario, keyThingsToWatch };
}

interface EvInput {
  id: string;
  title: string;
  startsAt: string;
  country: Country;
  importance: Importance;
  type: EventType;
  markets: Market[];
  affectedAssets: string[];
  explanation: string;
  reaction: MarketReaction;
  previous?: string;
  forecast?: string;
  actual?: string;
  confirmation?: Confirmation;
  sourceUrl?: string;
}

function ev(i: EvInput): MarketEvent {
  return {
    ...i,
    confirmation: i.confirmation ?? "confirmed",
    status: i.actual !== undefined ? "released" : "scheduled",
  };
}

interface EarnInput {
  id: string;
  name: string;
  ticker: string;
  startsAt: string;
  session: "pre" | "after";
  epsForecast?: string;
  epsActual?: string;
  revenueForecast?: string;
  revenueActual?: string;
  guidance?: string;
  impliedMove?: string;
  featured?: boolean;
  confirmation?: Confirmation;
}

const EARNINGS_REACTION = reaction(
  "EPS и выручка выше прогноза + сильный guidance → акция растёт и тянет за собой Nasdaq.",
  "EPS/выручка ниже прогноза или слабый guidance → акция падает и давит на весь сектор.",
  "Смешанный отчёт (beat по EPS, miss по выручке): реакция зависит от guidance и звонка с инвесторами.",
  ["EPS vs forecast", "Revenue vs forecast", "Guidance", "Implied move", "After-hours reaction", "Nasdaq follow-through"],
);

function earn(o: EarnInput): EarningsEvent {
  return {
    id: o.id,
    title: `${o.name} Earnings`,
    startsAt: o.startsAt,
    country: "USA",
    importance: o.featured ? "high" : "medium",
    type: "earnings",
    markets: ["stocks"],
    affectedAssets: [o.ticker, "Nasdaq", "S&P 500"],
    ticker: o.ticker,
    session: o.session,
    epsForecast: o.epsForecast,
    epsActual: o.epsActual,
    revenueForecast: o.revenueForecast,
    revenueActual: o.revenueActual,
    guidance: o.guidance,
    impliedMove: o.impliedMove,
    featured: o.featured,
    status: o.epsActual !== undefined ? "released" : "scheduled",
    confirmation: o.confirmation ?? "tentative",
    explanation: `Отчётность ${o.name} (${o.ticker}) — ключевой риск для самой акции и индикатор настроений в техах. ${
      o.session === "after" ? "Отчёт после закрытия рынка (after-hours)." : "Отчёт до открытия рынка (pre-market)."
    }`,
    reaction: EARNINGS_REACTION,
  };
}

/* ---------------------------------------------------------------------------
 * Shared explanations + reactions
 * ------------------------------------------------------------------------- */

const CPI_EXPLANATION =
  "CPI измеряет инфляцию в США и напрямую влияет на ожидания по ставке ФРС. Один из главных драйверов волатильности месяца.";
const CPI_REACTION = reaction(
  "CPI ниже прогноза: USD слабеет, доходности падают, Nasdaq/S&P 500 и BTC могут расти, золото растёт.",
  "CPI выше прогноза: USD и доходности растут, акции и крипта под давлением, золото сначала может упасть из-за роста yields.",
  "CPI совпал с прогнозом: реакция уходит в детали — Core CPI, MoM/YoY и shelter inflation.",
  ["Core CPI", "MoM", "YoY", "Shelter inflation", "DXY", "US10Y", "Nasdaq reaction"],
);

const PCE_REACTION = reaction(
  "Core PCE ниже прогноза: подтверждает дезинфляцию, ФРС ближе к снижению ставки — risk-on.",
  "Core PCE выше прогноза: любимый инфляционный индикатор ФРС горячий — hawkish, давление на акции и крипту.",
  "Core PCE в рамках прогноза: смотрят на тренд и пересмотры предыдущих месяцев.",
  ["Core PCE MoM", "Core PCE YoY", "Personal Income", "Personal Spending", "US10Y", "DXY"],
);

const NFP_REACTION = reaction(
  "NFP умеренно ниже прогноза: рынок начинает закладывать снижение ставки, Nasdaq/BTC могут расти.",
  "NFP выше прогноза: сильный рынок труда, ФРС дольше держит ставку высокой, USD растёт, risk assets под давлением.",
  "NFP около прогноза: фокус на безработице, пересмотрах прошлых месяцев и средней зарплате. Очень слабый отчёт может вызвать risk-off из-за страха рецессии.",
  ["Безработица", "Average Hourly Earnings", "Пересмотры прошлых данных", "Participation rate", "DXY", "US10Y"],
);

const CLAIMS_REACTION = reaction(
  "Заявок меньше прогноза: рынок труда крепкий — обычно нейтрально-позитивно для акций, но hawkish для ставок.",
  "Заявок заметно больше прогноза: первый сигнал охлаждения занятости — может усилить ожидания снижения ставки.",
  "Заявки около прогноза: смотрят на 4-недельную скользящую среднюю, а не на одно значение.",
  ["Initial Claims", "Continuing Claims", "4-week average", "US10Y"],
);

const FOMC_REACTION = reaction(
  "Dovish (мягкий тон): акции и крипта растут, USD и доходности падают, золото растёт.",
  "Hawkish (жёсткий тон): акции и крипта падают, USD и доходности растут, золото под давлением.",
  "Ставку оставили без изменений: фокус смещается на заявление, dot plot и пресс-конференцию Powell.",
  ["Решение по ставке", "Заявление FOMC", "Dot plot", "Пресс-конференция Powell", "Прогнозы по инфляции/безработице/GDP", "US10Y", "DXY"],
);

const GROWTH_REACTION = reaction(
  "Данные выше прогноза: экономика крепкая — обычно позитивно для акций, если не разгоняет страх перед ставкой.",
  "Данные ниже прогноза: сигнал замедления — давит на циклические активы и risk sentiment.",
  "Данные около прогноза: смотрят на детали отчёта и тренд за несколько месяцев.",
  ["Заголовок vs forecast", "Внутренние компоненты", "Тренд 3–6 мес", "Реакция доходностей"],
);

const GDP_REACTION = reaction(
  "GDP выше прогноза: сильный рост экономики — risk-positive, если не усиливает инфляционные опасения.",
  "GDP ниже прогноза: рост слабее ожиданий — повышает опасения замедления, давит на акции.",
  "GDP около прогноза: внимание на дефлятор GDP и структуру роста (потребление, инвестиции).",
  ["GDP QoQ", "GDP Price Index", "Личное потребление", "US10Y"],
);

const CRYPTO_REACTION = reaction(
  "Позитив (приток в ETF, мягкая регуляторика): BTC/ETH и альты растут, risk appetite повышается.",
  "Негатив (отток, жёсткая регуляторика, крупный unlock): давление на BTC/ETH и альты, рост волатильности.",
  "Нейтрально: смотрят на funding rate, open interest и уровни ликвидаций.",
  ["BTC price", "ETF flows", "Funding rate", "Open interest", "Liquidation levels"],
);

const BONDS_REACTION = reaction(
  "Сильный спрос на аукционе / падение доходностей: поддержка для акций и золота.",
  "Слабый спрос / рост доходностей: давление на длинные акции, Nasdaq и золото.",
  "Спрос в рамках нормы: смотрят на bid-to-cover и tail аукциона.",
  ["Bid-to-cover", "US10Y", "US02Y", "DXY"],
);

const SPEECH_REACTION = reaction(
  "Мягкие комментарии (намёк на снижение ставки): risk-on, USD слабеет.",
  "Жёсткие комментарии (выше дольше): risk-off, USD укрепляется.",
  "Нейтральные комментарии: рынок ищет любые намёки на сроки изменения ставки.",
  ["Тон выступления", "Намёки по ставке", "Реакция US10Y", "Реакция DXY"],
);

const US_RATES_MARKETS: Market[] = ["forex", "stocks", "crypto", "gold", "bonds"];
const US_RATES_ASSETS = ["USD", "Gold", "Nasdaq", "S&P 500", "BTC", "US10Y"];

/* ---------------------------------------------------------------------------
 * Recurring macro schedules
 * ------------------------------------------------------------------------- */

interface SchedRow {
  id: string;
  startsAt: string;
  previous?: string;
  forecast?: string;
  actual?: string;
  confirmation?: Confirmation;
}

const CPI_SCHEDULE: SchedRow[] = [
  { id: "cpi-2026-06", startsAt: "2026-06-10T12:30:00Z", previous: "3.4%", forecast: "3.3%" },
  { id: "cpi-2026-07", startsAt: "2026-07-14T12:30:00Z", previous: "3.3%", forecast: "3.2%" },
  { id: "cpi-2026-08", startsAt: "2026-08-12T12:30:00Z", previous: "3.2%", forecast: "3.1%" },
  { id: "cpi-2026-09", startsAt: "2026-09-11T12:30:00Z", previous: "3.1%", forecast: "3.0%", confirmation: "estimated" },
  { id: "cpi-2026-10", startsAt: "2026-10-13T12:30:00Z", previous: "3.0%", forecast: "2.9%", confirmation: "estimated" },
  { id: "cpi-2026-11", startsAt: "2026-11-12T13:30:00Z", previous: "2.9%", forecast: "2.9%", confirmation: "estimated" },
  { id: "cpi-2026-12", startsAt: "2026-12-10T13:30:00Z", previous: "2.9%", forecast: "2.8%", confirmation: "estimated" },
];

const cpiEvents = CPI_SCHEDULE.map((r) =>
  ev({
    id: r.id,
    title: "US CPI (YoY)",
    startsAt: r.startsAt,
    country: "USA",
    importance: "high",
    type: "inflation",
    markets: US_RATES_MARKETS,
    affectedAssets: US_RATES_ASSETS,
    explanation: CPI_EXPLANATION,
    reaction: CPI_REACTION,
    previous: r.previous,
    forecast: r.forecast,
    actual: r.actual,
    confirmation: r.confirmation,
    sourceUrl: "https://www.bls.gov/cpi/",
  }),
);

// Core CPI shown alongside the first couple of prints (avoids spamming every month).
const coreCpiEvents = [
  ev({
    id: "core-cpi-2026-06",
    title: "US Core CPI (YoY)",
    startsAt: "2026-06-10T12:30:00Z",
    country: "USA",
    importance: "high",
    type: "inflation",
    markets: US_RATES_MARKETS,
    affectedAssets: US_RATES_ASSETS,
    explanation: "Core CPI исключает еду и энергию — для ФРС это более устойчивый сигнал инфляции, чем headline.",
    reaction: CPI_REACTION,
    previous: "3.6%",
    forecast: "3.5%",
    sourceUrl: "https://www.bls.gov/cpi/",
  }),
  ev({
    id: "core-cpi-2026-07",
    title: "US Core CPI (YoY)",
    startsAt: "2026-07-14T12:30:00Z",
    country: "USA",
    importance: "high",
    type: "inflation",
    markets: US_RATES_MARKETS,
    affectedAssets: US_RATES_ASSETS,
    explanation: "Core CPI исключает еду и энергию — для ФРС это более устойчивый сигнал инфляции, чем headline.",
    reaction: CPI_REACTION,
    previous: "3.5%",
    forecast: "3.4%",
    sourceUrl: "https://www.bls.gov/cpi/",
  }),
];

const NFP_SCHEDULE: SchedRow[] = [
  // Already released two days before "today" — drives the surprise demo.
  { id: "nfp-2026-06", startsAt: "2026-06-05T12:30:00Z", previous: "177K", forecast: "175K", actual: "139K" },
  { id: "nfp-2026-07", startsAt: "2026-07-03T12:30:00Z", previous: "139K", forecast: "160K" },
  { id: "nfp-2026-08", startsAt: "2026-08-07T12:30:00Z", previous: "160K", forecast: "165K" },
  { id: "nfp-2026-09", startsAt: "2026-09-04T12:30:00Z", previous: "165K", forecast: "170K", confirmation: "estimated" },
  { id: "nfp-2026-10", startsAt: "2026-10-02T12:30:00Z", previous: "170K", forecast: "170K", confirmation: "estimated" },
  { id: "nfp-2026-11", startsAt: "2026-11-06T13:30:00Z", previous: "170K", forecast: "175K", confirmation: "estimated" },
  { id: "nfp-2026-12", startsAt: "2026-12-04T13:30:00Z", previous: "175K", forecast: "180K", confirmation: "estimated" },
];

const nfpEvents = NFP_SCHEDULE.map((r) =>
  ev({
    id: r.id,
    title: "US Nonfarm Payrolls",
    startsAt: r.startsAt,
    country: "USA",
    importance: "high",
    type: "jobs",
    markets: US_RATES_MARKETS,
    affectedAssets: ["USD", "Gold", "Nasdaq", "S&P 500", "BTC"],
    explanation:
      "NFP показывает, сколько рабочих мест создано в США за месяц — главный индикатор рынка труда и ключевой вход для решений ФРС.",
    reaction: NFP_REACTION,
    previous: r.previous,
    forecast: r.forecast,
    actual: r.actual,
    confirmation: r.confirmation,
    sourceUrl: "https://www.bls.gov/ces/",
  }),
);

const FOMC_SCHEDULE: SchedRow[] = [
  { id: "fomc-2026-06", startsAt: "2026-06-17T18:00:00Z", previous: "4.50%", forecast: "4.50%" },
  { id: "fomc-2026-07", startsAt: "2026-07-29T18:00:00Z", previous: "4.50%", forecast: "4.50%" },
  { id: "fomc-2026-09", startsAt: "2026-09-16T18:00:00Z", previous: "4.50%", forecast: "4.25%" },
  { id: "fomc-2026-10", startsAt: "2026-10-28T18:00:00Z", previous: "4.25%", forecast: "4.25%" },
  { id: "fomc-2026-12", startsAt: "2026-12-09T19:00:00Z", previous: "4.25%", forecast: "4.00%" },
];

const fomcEvents = FOMC_SCHEDULE.map((r) =>
  ev({
    id: r.id,
    title: "FOMC Rate Decision",
    startsAt: r.startsAt,
    country: "USA",
    importance: "high",
    type: "central_bank",
    markets: US_RATES_MARKETS,
    affectedAssets: ["USD", "Gold", "Nasdaq", "S&P 500", "BTC", "US10Y", "US02Y"],
    explanation:
      "Решение ФРС по ставке плюс заявление, dot plot и пресс-конференция Powell — обычно самое волатильное событие месяца.",
    reaction: FOMC_REACTION,
    previous: r.previous,
    forecast: r.forecast,
    confirmation: "confirmed",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  }),
);

const PCE_SCHEDULE: SchedRow[] = [
  { id: "pce-2026-06", startsAt: "2026-06-26T12:30:00Z", previous: "2.7%", forecast: "2.6%" },
  { id: "pce-2026-07", startsAt: "2026-07-31T12:30:00Z", previous: "2.6%", forecast: "2.6%" },
  { id: "pce-2026-08", startsAt: "2026-08-28T12:30:00Z", previous: "2.6%", forecast: "2.5%", confirmation: "estimated" },
  { id: "pce-2026-09", startsAt: "2026-09-25T12:30:00Z", previous: "2.5%", forecast: "2.5%", confirmation: "estimated" },
  { id: "pce-2026-10", startsAt: "2026-10-30T12:30:00Z", previous: "2.5%", forecast: "2.4%", confirmation: "estimated" },
];

const pceEvents = PCE_SCHEDULE.map((r) =>
  ev({
    id: r.id,
    title: "US Core PCE (YoY)",
    startsAt: r.startsAt,
    country: "USA",
    importance: "high",
    type: "inflation",
    markets: US_RATES_MARKETS,
    affectedAssets: US_RATES_ASSETS,
    explanation: "Core PCE — предпочитаемый ФРС индикатор инфляции. Часто важнее CPI для траектории ставки.",
    reaction: PCE_REACTION,
    previous: r.previous,
    forecast: r.forecast,
    confirmation: r.confirmation,
    sourceUrl: "https://www.bea.gov/",
  }),
);

const ECB_SCHEDULE: SchedRow[] = [
  { id: "ecb-2026-06", startsAt: "2026-06-11T12:15:00Z", previous: "2.40%", forecast: "2.40%" },
  { id: "ecb-2026-07", startsAt: "2026-07-23T12:15:00Z", previous: "2.40%", forecast: "2.25%" },
  { id: "ecb-2026-09", startsAt: "2026-09-10T12:15:00Z", previous: "2.25%", forecast: "2.25%", confirmation: "estimated" },
  { id: "ecb-2026-10", startsAt: "2026-10-29T12:15:00Z", previous: "2.25%", forecast: "2.25%", confirmation: "estimated" },
];

const ecbEvents = ECB_SCHEDULE.map((r) =>
  ev({
    id: r.id,
    title: "ECB Rate Decision",
    startsAt: r.startsAt,
    country: "EU",
    importance: "high",
    type: "central_bank",
    markets: ["forex", "stocks", "bonds"],
    affectedAssets: ["EUR", "DAX", "Euro Stoxx 50", "Gold"],
    explanation:
      "Решение ЕЦБ по ставке и пресс-конференция Лагард — главный драйвер для EUR и европейских индексов.",
    reaction: reaction(
      "Dovish ЕЦБ: EUR может ослабнуть, европейские акции растут.",
      "Hawkish ЕЦБ: EUR укрепляется, давление на длинные акции и облигации.",
      "Ставку держат: фокус на пресс-конференции и прогнозах по инфляции еврозоны.",
      ["Решение по ставке", "Тон Лагард", "Прогнозы по инфляции", "EUR/USD", "Bund yields"],
    ),
    previous: r.previous,
    forecast: r.forecast,
    confirmation: r.confirmation,
    sourceUrl: "https://www.ecb.europa.eu/",
  }),
);

/* ---------------------------------------------------------------------------
 * This week (centred on today, 2026-06-07) — richer one-off events
 * ------------------------------------------------------------------------- */

const thisWeek: MarketEvent[] = [
  // Released last Friday (surprise demo companions to NFP)
  ev({
    id: "ahe-2026-06",
    title: "Average Hourly Earnings (MoM)",
    startsAt: "2026-06-05T12:30:00Z",
    country: "USA",
    importance: "medium",
    type: "jobs",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y", "Nasdaq"],
    explanation: "Рост зарплат — проинфляционный фактор: высокие зарплаты усложняют ФРС задачу снижения инфляции.",
    reaction: NFP_REACTION,
    previous: "0.3%",
    forecast: "0.3%",
    actual: "0.2%",
  }),
  ev({
    id: "unrate-2026-06",
    title: "US Unemployment Rate",
    startsAt: "2026-06-05T12:30:00Z",
    country: "USA",
    importance: "high",
    type: "jobs",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y", "Nasdaq", "BTC"],
    explanation: "Уровень безработицы — ключевая часть отчёта по занятости; рост может ускорить ожидания снижения ставки.",
    reaction: NFP_REACTION,
    previous: "4.2%",
    forecast: "4.2%",
    actual: "4.3%",
  }),
  // Today — crypto (24/7)
  ev({
    id: "btc-etf-flows-2026-06-07",
    title: "Bitcoin Spot ETF — Weekly Flows",
    startsAt: "2026-06-07T13:00:00Z",
    country: "Global",
    importance: "medium",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["BTC", "ETH"],
    explanation:
      "Недельные потоки в спотовые BTC-ETF показывают институциональный спрос. Сильные притоки часто поддерживают цену BTC.",
    reaction: CRYPTO_REACTION,
    previous: "+$1.1B",
    forecast: "+$1.2B",
    actual: "+$2.4B",
  }),
  ev({
    id: "eth-etf-flows-2026-06-07",
    title: "Ethereum Spot ETF — Weekly Flows",
    startsAt: "2026-06-07T13:05:00Z",
    country: "Global",
    importance: "low",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["ETH", "BTC"],
    explanation: "Потоки в спотовые ETH-ETF отражают институциональный спрос на Ethereum.",
    reaction: CRYPTO_REACTION,
    previous: "+$180M",
    forecast: "+$200M",
    actual: "+$310M",
  }),
  ev({
    id: "arb-unlock-2026-06-07",
    title: "ARB Token Unlock (~2.1% supply)",
    startsAt: "2026-06-07T16:00:00Z",
    country: "Global",
    importance: "medium",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["ARB"],
    explanation:
      "Крупная разблокировка токенов увеличивает предложение в обращении и может создавать давление на цену в день анлока.",
    reaction: CRYPTO_REACTION,
    previous: "—",
    forecast: "≈ $92M по текущей цене",
  }),
  // Mon–Fri this week
  ev({
    id: "fed-speak-2026-06-08",
    title: "Fed Speaker — Williams",
    startsAt: "2026-06-08T17:00:00Z",
    country: "USA",
    importance: "medium",
    type: "speech",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y"],
    explanation: "Выступление члена ФРС перед «тихим периодом» (blackout) до заседания — рынок ищет намёки по ставке.",
    reaction: SPEECH_REACTION,
  }),
  ev({
    id: "ust-3y-2026-06-09",
    title: "US 3-Year Note Auction",
    startsAt: "2026-06-09T17:00:00Z",
    country: "USA",
    importance: "low",
    type: "bonds",
    markets: ["bonds", "forex"],
    affectedAssets: ["US02Y", "US10Y", "USD"],
    explanation: "Аукцион гособлигаций США показывает спрос на долг и влияет на доходности по всей кривой.",
    reaction: BONDS_REACTION,
    previous: "bid-to-cover 2.58",
  }),
  ev({
    id: "ust-10y-2026-06-10",
    title: "US 10-Year Note Auction",
    startsAt: "2026-06-10T17:00:00Z",
    country: "USA",
    importance: "medium",
    type: "bonds",
    markets: ["bonds", "forex", "stocks"],
    affectedAssets: ["US10Y", "USD", "Nasdaq"],
    explanation: "Аукцион 10-летних трежерис — важный сигнал спроса на длинный долг США; слабый спрос толкает доходности вверх.",
    reaction: BONDS_REACTION,
    previous: "bid-to-cover 2.41",
  }),
  ev({
    id: "ppi-2026-06-11",
    title: "US PPI (MoM)",
    startsAt: "2026-06-11T12:30:00Z",
    country: "USA",
    importance: "medium",
    type: "inflation",
    markets: US_RATES_MARKETS,
    affectedAssets: ["USD", "Gold", "Nasdaq", "US10Y"],
    explanation: "PPI — инфляция цен производителей; опережающий сигнал для будущего потребительского CPI.",
    reaction: CPI_REACTION,
    previous: "0.2%",
    forecast: "0.2%",
  }),
  ev({
    id: "claims-2026-06-11",
    title: "US Initial Jobless Claims",
    startsAt: "2026-06-11T12:30:00Z",
    country: "USA",
    importance: "medium",
    type: "jobs",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y", "Nasdaq"],
    explanation: "Еженедельные заявки на пособие по безработице — оперативный пульс рынка труда.",
    reaction: CLAIMS_REACTION,
    previous: "219K",
    forecast: "225K",
  }),
  ev({
    id: "michigan-2026-06-12",
    title: "Michigan Consumer Sentiment (Prelim)",
    startsAt: "2026-06-12T14:00:00Z",
    country: "USA",
    importance: "medium",
    type: "other",
    markets: ["forex", "stocks"],
    affectedAssets: ["USD", "Nasdaq", "S&P 500"],
    explanation:
      "Индекс настроений потребителей Мичигана включает инфляционные ожидания, на которые внимательно смотрит ФРС.",
    reaction: GROWTH_REACTION,
    previous: "60.5",
    forecast: "61.0",
  }),
];

/* ---------------------------------------------------------------------------
 * Later in June / macro one-offs
 * ------------------------------------------------------------------------- */

const macroOneOffs: MarketEvent[] = [
  ev({
    id: "retail-2026-06-16",
    title: "US Retail Sales (MoM)",
    startsAt: "2026-06-16T12:30:00Z",
    country: "USA",
    importance: "high",
    type: "other",
    markets: ["forex", "stocks", "crypto"],
    affectedAssets: ["USD", "Nasdaq", "S&P 500", "BTC"],
    explanation: "Розничные продажи — главный индикатор потребительского спроса, ~70% экономики США.",
    reaction: GROWTH_REACTION,
    previous: "0.1%",
    forecast: "0.3%",
  }),
  ev({
    id: "powell-presser-2026-06-17",
    title: "Fed Chair Powell Press Conference",
    startsAt: "2026-06-17T18:30:00Z",
    country: "USA",
    importance: "high",
    type: "speech",
    markets: US_RATES_MARKETS,
    affectedAssets: ["USD", "Gold", "Nasdaq", "S&P 500", "BTC", "US10Y"],
    explanation:
      "Пресс-конференция Powell сразу после решения FOMC. Тон и ответы на вопросы часто двигают рынок сильнее самого решения.",
    reaction: FOMC_REACTION,
    confirmation: "confirmed",
  }),
  ev({
    id: "boe-2026-06-18",
    title: "Bank of England Rate Decision",
    startsAt: "2026-06-18T11:00:00Z",
    country: "UK",
    importance: "high",
    type: "central_bank",
    markets: ["forex", "stocks", "bonds"],
    affectedAssets: ["GBP", "FTSE 100"],
    explanation: "Решение Банка Англии по ставке — главный драйвер для GBP и британского рынка.",
    reaction: reaction(
      "Dovish BoE: GBP слабеет, FTSE может расти.",
      "Hawkish BoE: GBP укрепляется, давление на акции.",
      "Ставку держат: фокус на голосовании MPC и прогнозах по инфляции.",
      ["Решение по ставке", "Сплит голосов MPC", "GBP/USD", "Gilt yields"],
    ),
    previous: "4.00%",
    forecast: "3.75%",
  }),
  ev({
    id: "claims-2026-06-18",
    title: "US Initial Jobless Claims",
    startsAt: "2026-06-18T12:30:00Z",
    country: "USA",
    importance: "medium",
    type: "jobs",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y", "Nasdaq"],
    explanation: "Еженедельные заявки на пособие по безработице — оперативный пульс рынка труда.",
    reaction: CLAIMS_REACTION,
    previous: "225K",
    forecast: "223K",
  }),
  ev({
    id: "boj-2026-06-19",
    title: "Bank of Japan Rate Decision",
    startsAt: "2026-06-19T03:00:00Z",
    country: "Japan",
    importance: "high",
    type: "central_bank",
    markets: ["forex", "stocks", "bonds"],
    affectedAssets: ["JPY", "Nikkei 225"],
    explanation: "Решение Банка Японии — драйвер для JPY и темы carry-trade, влияющей на глобальную ликвидность.",
    reaction: reaction(
      "Dovish BoJ: JPY слабеет, Nikkei растёт, carry-trade поддержан.",
      "Hawkish BoJ: JPY укрепляется, риск раскрутки carry-trade и волатильности на глобальных рынках.",
      "Без изменений: фокус на тоне Уэды и намёках по YCC/ставке.",
      ["Решение по ставке", "Тон управляющего", "USD/JPY", "JGB yields"],
    ),
    previous: "0.50%",
    forecast: "0.50%",
  }),
  ev({
    id: "gdp-2026-06-25",
    title: "US GDP (Q1, Final QoQ)",
    startsAt: "2026-06-25T12:30:00Z",
    country: "USA",
    importance: "high",
    type: "gdp",
    markets: ["forex", "stocks", "bonds"],
    affectedAssets: ["USD", "Nasdaq", "S&P 500", "US10Y"],
    explanation: "Финальная оценка ВВП США за квартал — итоговый замер темпа роста экономики.",
    reaction: GDP_REACTION,
    previous: "2.4%",
    forecast: "2.4%",
  }),
  ev({
    id: "ism-mfg-2026-07-01",
    title: "ISM Manufacturing PMI",
    startsAt: "2026-07-01T14:00:00Z",
    country: "USA",
    importance: "medium",
    type: "other",
    markets: ["forex", "stocks"],
    affectedAssets: ["USD", "Nasdaq", "S&P 500"],
    explanation: "ISM Manufacturing PMI — опережающий индикатор: выше 50 = рост, ниже 50 = сжатие производства.",
    reaction: GROWTH_REACTION,
    previous: "48.7",
    forecast: "49.2",
  }),
  ev({
    id: "ism-svc-2026-07-06",
    title: "ISM Services PMI",
    startsAt: "2026-07-06T14:00:00Z",
    country: "USA",
    importance: "medium",
    type: "other",
    markets: ["forex", "stocks"],
    affectedAssets: ["USD", "Nasdaq", "S&P 500"],
    explanation: "ISM Services PMI охватывает крупнейший сектор экономики США — сферу услуг.",
    reaction: GROWTH_REACTION,
    previous: "51.6",
    forecast: "52.0",
  }),
  ev({
    id: "jolts-2026-07-07",
    title: "JOLTS Job Openings",
    startsAt: "2026-07-07T14:00:00Z",
    country: "USA",
    importance: "medium",
    type: "jobs",
    markets: ["forex", "bonds", "stocks"],
    affectedAssets: ["USD", "US10Y"],
    explanation: "JOLTS показывает число открытых вакансий — мера спроса на труд, которую отслеживает ФРС.",
    reaction: NFP_REACTION,
    previous: "7.4M",
    forecast: "7.3M",
    confirmation: "estimated",
  }),
  ev({
    id: "fomc-minutes-2026-07-08",
    title: "FOMC Meeting Minutes",
    startsAt: "2026-07-08T18:00:00Z",
    country: "USA",
    importance: "medium",
    type: "central_bank",
    markets: US_RATES_MARKETS,
    affectedAssets: ["USD", "Gold", "Nasdaq", "US10Y"],
    explanation: "Протокол заседания FOMC раскрывает детали дискуссии и баланс мнений внутри комитета.",
    reaction: FOMC_REACTION,
    confirmation: "confirmed",
  }),
];

/* ---------------------------------------------------------------------------
 * Earnings (Q2 season, late Jul → Aug 2026)
 * ------------------------------------------------------------------------- */

const earnings: EarningsEvent[] = [
  earn({
    id: "ern-nflx-2026-07-16",
    name: "Netflix",
    ticker: "NFLX",
    startsAt: "2026-07-16T20:05:00Z",
    session: "after",
    epsForecast: "$5.10",
    revenueForecast: "$11.1B",
    impliedMove: "±8%",
  }),
  earn({
    id: "ern-tsla-2026-07-22",
    name: "Tesla",
    ticker: "TSLA",
    startsAt: "2026-07-22T20:05:00Z",
    session: "after",
    epsForecast: "$0.62",
    revenueForecast: "$26.4B",
    impliedMove: "±9%",
    featured: true,
  }),
  earn({
    id: "ern-msft-2026-07-28",
    name: "Microsoft",
    ticker: "MSFT",
    startsAt: "2026-07-28T20:05:00Z",
    session: "after",
    epsForecast: "$3.55",
    revenueForecast: "$74.5B",
    impliedMove: "±5%",
    featured: true,
  }),
  earn({
    id: "ern-googl-2026-07-28",
    name: "Alphabet",
    ticker: "GOOGL",
    startsAt: "2026-07-28T20:05:00Z",
    session: "after",
    epsForecast: "$2.18",
    revenueForecast: "$96.2B",
    impliedMove: "±6%",
    featured: true,
  }),
  earn({
    id: "ern-meta-2026-07-29",
    name: "Meta Platforms",
    ticker: "META",
    startsAt: "2026-07-29T20:05:00Z",
    session: "after",
    epsForecast: "$6.40",
    revenueForecast: "$47.8B",
    impliedMove: "±8%",
    featured: true,
  }),
  earn({
    id: "ern-aapl-2026-07-30",
    name: "Apple",
    ticker: "AAPL",
    startsAt: "2026-07-30T20:05:00Z",
    session: "after",
    epsForecast: "$1.43",
    revenueForecast: "$89.5B",
    impliedMove: "±5%",
    featured: true,
  }),
  earn({
    id: "ern-amzn-2026-07-30",
    name: "Amazon",
    ticker: "AMZN",
    startsAt: "2026-07-30T20:05:00Z",
    session: "after",
    epsForecast: "$1.32",
    revenueForecast: "$172.0B",
    impliedMove: "±7%",
    featured: true,
  }),
  earn({
    id: "ern-coin-2026-07-30",
    name: "Coinbase",
    ticker: "COIN",
    startsAt: "2026-07-30T20:05:00Z",
    session: "after",
    epsForecast: "$1.05",
    revenueForecast: "$1.6B",
    impliedMove: "±11%",
  }),
  earn({
    id: "ern-amd-2026-08-04",
    name: "AMD",
    ticker: "AMD",
    startsAt: "2026-08-04T20:05:00Z",
    session: "after",
    epsForecast: "$1.18",
    revenueForecast: "$8.9B",
    impliedMove: "±9%",
  }),
  earn({
    id: "ern-pltr-2026-08-04",
    name: "Palantir",
    ticker: "PLTR",
    startsAt: "2026-08-04T20:05:00Z",
    session: "after",
    epsForecast: "$0.18",
    revenueForecast: "$1.1B",
    impliedMove: "±13%",
  }),
  earn({
    id: "ern-nvda-2026-08-26",
    name: "Nvidia",
    ticker: "NVDA",
    startsAt: "2026-08-26T20:05:00Z",
    session: "after",
    epsForecast: "$1.45",
    revenueForecast: "$58.0B",
    guidance: "Прогноз ждут сильным на фоне спроса на AI-чипы.",
    impliedMove: "±10%",
    featured: true,
  }),
];

/* ---------------------------------------------------------------------------
 * Crypto-specific events
 * ------------------------------------------------------------------------- */

const crypto: MarketEvent[] = [
  ev({
    id: "sec-crypto-2026-06-15",
    title: "SEC Crypto Regulation Hearing",
    startsAt: "2026-06-15T14:00:00Z",
    country: "USA",
    importance: "medium",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["BTC", "ETH", "COIN"],
    explanation:
      "Слушания SEC по регулированию крипты могут задавать тон для всего сектора — особенно для бирж и стейблкоинов.",
    reaction: CRYPTO_REACTION,
    confirmation: "tentative",
  }),
  ev({
    id: "btc-etf-flows-2026-06-14",
    title: "Bitcoin Spot ETF — Weekly Flows",
    startsAt: "2026-06-14T13:00:00Z",
    country: "Global",
    importance: "low",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["BTC"],
    explanation: "Недельные потоки в спотовые BTC-ETF — барометр институционального спроса.",
    reaction: CRYPTO_REACTION,
    previous: "+$2.4B",
    forecast: "+$1.5B",
  }),
  ev({
    id: "op-unlock-2026-07-01",
    title: "OP Token Unlock (~1.8% supply)",
    startsAt: "2026-07-01T00:00:00Z",
    country: "Global",
    importance: "medium",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["OP"],
    explanation: "Плановая разблокировка токенов Optimism увеличивает предложение и может давить на цену.",
    reaction: CRYPTO_REACTION,
    confirmation: "confirmed",
  }),
  ev({
    id: "eth-etf-flows-2026-07-12",
    title: "Ethereum Spot ETF — Weekly Flows",
    startsAt: "2026-07-12T13:00:00Z",
    country: "Global",
    importance: "low",
    type: "crypto",
    markets: ["crypto"],
    affectedAssets: ["ETH"],
    explanation: "Потоки в спотовые ETH-ETF отражают институциональный спрос на Ethereum.",
    reaction: CRYPTO_REACTION,
    confirmation: "estimated",
  }),
];

/* ---------------------------------------------------------------------------
 * Final dataset
 * ------------------------------------------------------------------------- */

export const mockEvents: MarketEvent[] = [
  ...cpiEvents,
  ...coreCpiEvents,
  ...nfpEvents,
  ...fomcEvents,
  ...pceEvents,
  ...ecbEvents,
  ...thisWeek,
  ...macroOneOffs,
  ...earnings,
  ...crypto,
];
