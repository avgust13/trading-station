# Trading Station

A live market dashboard. Tracks a curated set of symbols (equities, sectors, bonds, crude, crypto)
and shows previous/latest price, daily change, and weekly / MTD / YTD percent moves with color-coded
cells and embedded TradingView mini-charts.

Built as a single **Next.js** (App Router) app:

- **UI** — React + TypeScript + styled-components
- **API** — co-located Route Handler (`app/api/data`) that fetches via [`yahoo-finance2`](https://www.npmjs.com/package/yahoo-finance2)
- **One app, one process** — no separate backend. `yahoo-finance2` runs server-side in the route
  handler (it can't run in the browser — CORS/cookies); the UI just calls `/api/data` on the same origin.

## Requirements

- Node.js 20+ (tested with Node 22)

## Setup

```bash
npm install
```

The **Blotter** tab (AI trade-journal import) needs an OpenAI key. Put it in `.env.local`
(or a system environment variable):

```
OPENAI_API_KEY=sk-...
# optional, defaults to gpt-4o-mini:
# OPENAI_MODEL=gpt-4o
```

## Develop

```bash
npm run dev
```

Open http://localhost:8888 and click the refresh icon (top-right) to fetch live data. On reload the
last fetched snapshot is shown from `localStorage`; a fresh fetch happens only when you click refresh.

## Build & run (production)

```bash
npm run build
npm start
```

Open http://localhost:8888.

## Type-check

```bash
npm run typecheck
```

## Run with Docker

The image uses Next.js `output: "standalone"` for a small, self-contained server.

```bash
docker compose up -d --build
```

Then open http://localhost:8888. To stop:

```bash
docker compose down
```

## API

- `GET /api/data` — `{ as_of, rows, source: "live" }`. Each row:
  `{ symbol, name, desc, yest, today, chg, chg_pct, wk_pct, mtd_pct, ytd_pct, as_of, price_basis }`.
  Returns HTTP 502 if no live rows are available.
- `POST /api/blotter/parse` — body `{ text }` or `{ imageBase64, imageMimeType }`; OpenAI extracts
  raw broker order executions → `{ fills, notes }`. Requires `OPENAI_API_KEY`.
- `GET /api/blotter/candles?symbol=&from=&to=` — intraday/daily OHLC candles from Yahoo Finance for
  the trade-details chart; the interval (1m…1d) degrades automatically with trade age.
- `GET|DELETE /api/blotter/state`, `POST|DELETE /api/blotter/fills`, `PUT /api/blotter/notes` —
  server-side journal persistence. Data lives in `data/blotter.json` (override the path with
  `BLOTTER_DATA_PATH`); back it up by copying the file. In Docker the `./data` volume keeps it
  across rebuilds.

## Metrics

Per symbol, against ~18 months of daily closes from Yahoo Finance:

- **Yest** — previous close
- **Today** — live quote when available, otherwise the latest close
- **Chg / Chg %** — daily change
- **Wk %** — vs. ~5 trading days ago
- **MTD % / YTD %** — vs. the last close of the prior month / year

## Project structure

```
app/
  layout.tsx          Root layout: styled-components registry + theme/global styles
  page.tsx            Renders <Dashboard/>
  registry.tsx        styled-components SSR registry (App Router)
  providers.tsx       ThemeProvider + GlobalStyle (client)
  api/data/route.ts   GET handler -> fetchAll() -> JSON (Node runtime, dynamic)
components/           Client UI: Dashboard, RefreshButton, StatusBar, MarketTable, MarketRow,
                      ChangeCell, ChartFrame
lib/
  market.ts           yahoo-finance2 fetch + metric math (server-only)
  tickers.ts          Curated instrument list
  types.ts            Shared types
  format.ts           Number formatting + color classification
  display.ts          Russian descriptions + TradingView symbols/links
  cache.ts            localStorage snapshot cache
  api.ts              Typed fetch of /api/data
  theme.ts            Dark palette + fonts
  GlobalStyle.ts      Global reset/body styles
next.config.mjs       styled-components compiler, standalone output, yahoo-finance2 external
```

## Notes

- Data source is Yahoo Finance via `yahoo-finance2`, which must run server-side (CORS/cookies), so
  the browser only ever talks to this app's `/api/data`.
- Market availability and symbol support depend on Yahoo Finance responses; per-symbol fetch failures
  are skipped rather than failing the whole request.
