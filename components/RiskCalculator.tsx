"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { groupFills } from "@/lib/blotter/grouping";
import { canOpenTrade, computeRiskState, getRiskSettings, type RiskStatus } from "@/lib/blotter/risk";
import { fetchBlotterState } from "@/lib/blotter/storage";
import type { BlotterState, CandleInterval } from "@/lib/blotter/types";
import { TICKERS } from "@/lib/tickers";
import {
  Affix,
  Button,
  Chip,
  Footnote,
  Hint,
  Input,
  InputWrap,
  Label,
  Page,
  PageHeader,
  Panel,
  SectionTitle,
  Segment,
  Select,
  StatLabel,
  StatRow,
  StatSub,
  StatValue,
} from "@/components/ui";
import { RiskChart } from "./RiskChart";

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

type Dir = "long" | "short";
type Tone = "fg" | "green" | "red" | "accent";

const RISK_PRESETS = ["0.5", "1", "2", "3"];

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}
function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function units(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const max = n >= 1000 ? 2 : n >= 1 ? 4 : 6;
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}
function plain(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
function pctStr(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function statusTone(s: RiskStatus): Tone {
  if (s === "ACTIVE") return "green";
  if (s.startsWith("RISK_LOCKED")) return "red";
  return "accent"; // WARNING_*
}

// Remember the last-used exchange + risk % + chart symbol/interval across
// sessions. Reads/writes are guarded so a locked-down localStorage (private
// mode) silently no-ops.
const LS_EXCHANGE = "rc.exchangeId";
const LS_RISK = "rc.riskPct";
const LS_SYMBOL = "rc.symbol";
const LS_INTERVAL = "rc.interval";

const INTERVALS: CandleInterval[] = ["1m", "5m", "15m", "1h", "1d"];

/** A finite number, or null. */
function fin(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}
function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: string): void {
  try {
    window.localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

const RISK_RULES = [
  "Риск на сделку — 1–2% депозита, не больше.",
  "Цель Reward : Risk ≥ 2 — прибыль минимум вдвое больше риска.",
  "Стоп ставь по структуре рынка (за уровень / свинг), а не «на глаз».",
  "После движения в твою сторону перенеси стоп в безубыток.",
  "Не усредняй убыточную позицию и не двигай стоп против себя.",
];

/* ----------------------------------------------------------------------------
 * Styles
 * -------------------------------------------------------------------------- */

// Responsive app layout. Areas reflow across three bands:
//  • <721px      — single column (trade, result, chart, limits, rules)
//  • 721–1023px  — trade|result side by side, chart full-width below
//  • ≥1024px     — narrow control rail + big chart spanning all rows on the right
const Layout = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  grid-template-areas:
    "trade"
    "result"
    "chart"
    "limits"
    "rules";

  @media (min-width: 721px) and (max-width: 1023px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "trade  result"
      "chart  chart"
      "limits limits"
      "rules  rules";
  }

  @media (min-width: 1024px) {
    grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
    align-items: start;
    grid-template-areas:
      "trade  chart"
      "result chart"
      "limits chart"
      "rules  chart";
  }
`;

const ChartArea = styled.div`
  grid-area: chart;
  min-width: 0;

  @media (min-width: 1024px) {
    position: sticky;
    top: 16px;
    /* Tall chart that roughly fills the viewport; consumed by RiskChart's Box. */
    --rc-chart-h: clamp(420px, calc(100vh - 120px), 820px);
  }
`;

const SegRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
`;

const FieldWrap = styled.div`
  margin-bottom: 14px;
`;

const Chips = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const Hero = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => `${theme.colors.accent}1a`};
  border: 1px solid ${({ theme }) => `${theme.colors.accent}55`};
  margin-bottom: 14px;
`;

const HeroLabel = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const HeroValue = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  margin-top: 2px;
`;

const HeroSub = styled.div`
  color: ${({ theme }) => theme.colors.price};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSize.base};
  margin-top: 4px;
`;

const Warn = styled.div`
  margin-top: 12px;
  padding: 8px 11px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => `${theme.colors.warning}1f`};
  border: 1px solid ${({ theme }) => `${theme.colors.warning}80`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1.45;
`;

const Section = styled.div`
  margin-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 16px;
`;

const TipList = styled.ul`
  margin: 0;
  padding-left: 18px;
  list-style: disc;
`;

const TipLi = styled.li`
  color: ${({ theme }) => theme.colors.fg};
  font-size: ${({ theme }) => theme.fontSize.base};
  line-height: 1.6;
  margin: 3px 0;
`;

const GateBanner = styled.div<{ $tone: "green" | "red" | "muted" }>`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  margin-bottom: 12px;
  font-size: ${({ theme }) => theme.fontSize.base};
  font-weight: 600;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.fg};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === "green"
        ? `${theme.colors.green}66`
        : $tone === "red"
          ? `${theme.colors.red}66`
          : theme.colors.border};
  background: ${({ theme, $tone }) =>
    $tone === "green"
      ? `${theme.colors.green}14`
      : $tone === "red"
        ? `${theme.colors.red}14`
        : "transparent"};
`;

const ChartTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 12px;
`;

const TickerCol = styled.div`
  flex: 1 1 200px;
  min-width: 180px;
`;

const IntervalChips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.base};
`;

const PriceVal = styled.b`
  color: ${({ theme }) => theme.colors.price};
  font-family: ${({ theme }) => theme.fonts.mono};
`;

/* ----------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */

export function RiskCalculator() {
  const [dir, setDir] = useState<Dir>("long");
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [tp, setTp] = useState("110");

  // Instrument chart: typed ticker, committed ticker (what we load), interval,
  // and the latest close reported back by the chart.
  const [symbol, setSymbol] = useState("");
  const [committedSymbol, setCommittedSymbol] = useState("");
  const [interval, setInterval] = useState<CandleInterval>("1d");
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Risk-limit gate: read the blotter journal (read-only) to check a prospective
  // trade against the selected exchange's daily/weekly/giveback limits.
  const [blotterState, setBlotterState] = useState<BlotterState | null>(null);
  const [selExId, setSelExId] = useState("");
  const initRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchBlotterState()
      .then((s) => {
        if (alive) setBlotterState(s);
      })
      .catch((err: unknown) => {
        console.error("[RiskCalculator] failed to load blotter state:", err);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Restore the remembered risk % on mount (read-only — writes happen in changeRisk).
  useEffect(() => {
    const saved = lsGet(LS_RISK);
    if (saved) setRiskPct(saved);
  }, []);

  // Restore the remembered chart symbol + interval on mount.
  useEffect(() => {
    const savedSym = lsGet(LS_SYMBOL);
    if (savedSym) {
      setSymbol(savedSym);
      setCommittedSymbol(savedSym);
    }
    const savedIv = lsGet(LS_INTERVAL);
    if (savedIv && (INTERVALS as string[]).includes(savedIv)) {
      setInterval(savedIv as CandleInterval);
    }
  }, []);

  // Debounce typing into a committed symbol (~0.5s). Explicit load uses loadNow().
  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    const id = window.setTimeout(() => {
      setCommittedSymbol(sym);
      if (sym) lsSet(LS_SYMBOL, sym);
    }, 500);
    return () => window.clearTimeout(id);
  }, [symbol]);

  // One-time init once the journal loads: restore the remembered exchange (or the
  // first one) and seed the balance from its capital.
  useEffect(() => {
    if (!blotterState || initRef.current) return;
    initRef.current = true;
    const saved = lsGet(LS_EXCHANGE);
    // "" = explicitly remembered "Manual"; a known id = that exchange; otherwise
    // (null / stale id) default to the first exchange.
    const candidate =
      saved === ""
        ? ""
        : saved && blotterState.exchanges.some((e) => e.id === saved)
          ? saved
          : (blotterState.exchanges[0]?.id ?? "");
    setSelExId(candidate);
    const ex = blotterState.exchanges.find((e) => e.id === candidate);
    if (ex) setBalance(String(ex.capital));
  }, [blotterState]);

  // If the selected exchange disappears later, fall back to "Manual".
  useEffect(() => {
    if (selExId && blotterState && !blotterState.exchanges.some((e) => e.id === selExId)) {
      setSelExId("");
    }
  }, [blotterState, selExId]);

  const selExchange = blotterState?.exchanges.find((e) => e.id === selExId) ?? null;

  // Pick an exchange: remember it and seed the balance from its capital.
  // "Manual" (id === "") leaves the balance editable as-is.
  const pickExchange = (id: string) => {
    setSelExId(id);
    lsSet(LS_EXCHANGE, id);
    const ex = blotterState?.exchanges.find((e) => e.id === id);
    if (ex) setBalance(String(ex.capital));
  };

  // Change risk % and remember it.
  const changeRisk = (v: string) => {
    setRiskPct(v);
    lsSet(LS_RISK, v);
  };

  // Load the chart immediately (Enter / button), bypassing the debounce.
  const loadNow = () => {
    const sym = symbol.trim().toUpperCase();
    setCommittedSymbol(sym);
    if (sym) lsSet(LS_SYMBOL, sym);
  };

  const changeInterval = (iv: CandleInterval) => {
    setInterval(iv);
    lsSet(LS_INTERVAL, iv);
  };

  const riskState = useMemo(() => {
    if (!blotterState) return null;
    const ex = blotterState.exchanges.find((x) => x.id === selExId);
    if (!ex) return null;
    const exTrades = groupFills(blotterState.fills).filter((tr) => tr.exchangeId === ex.id);
    const settings = getRiskSettings(blotterState.riskSettings, ex.id);
    return computeRiskState(exTrades, settings, ex.capital);
  }, [blotterState, selExId]);

  // Ticker autocomplete: curated instruments + symbols seen in the journal.
  const tickerOptions = useMemo(() => {
    const set = new Set<string>(TICKERS.map((tk) => tk.display));
    for (const f of blotterState?.fills ?? []) set.add(f.symbol.toUpperCase());
    return Array.from(set).sort();
  }, [blotterState]);

  const bal = num(balance);
  const risk = num(riskPct);
  const e = num(entry);
  const s = num(stop);
  const t = num(tp);

  const stopDist = Math.abs(e - s);
  const valid = bal > 0 && risk > 0 && e > 0 && s > 0 && stopDist > 0;

  const stopPct = valid ? (stopDist / e) * 100 : NaN;
  const riskAmt = bal > 0 && risk > 0 ? bal * (risk / 100) : NaN;
  const size = valid ? riskAmt / stopDist : NaN;
  const notional = valid ? size * e : NaN;
  const leverage = valid && bal > 0 ? notional / bal : NaN;

  const hasTp = t > 0;
  const rewardDist = hasTp ? Math.abs(t - e) : NaN;
  const rr = valid && hasTp ? rewardDist / stopDist : NaN;
  const profit = valid && hasTp ? size * rewardDist : NaN;
  const profitPct = valid && hasTp && bal > 0 ? (profit / bal) * 100 : NaN;

  // The dollars at risk on this trade = the gate's estimatedRisk.
  const gateRisk = Number.isFinite(riskAmt) && riskAmt > 0 ? riskAmt : null;
  const gate = riskState && gateRisk !== null ? canOpenTrade(riskState, gateRisk) : null;

  const warns: string[] = [];
  if (e > 0 && s > 0) {
    if (dir === "long" && s >= e) warns.push("For a long, the stop-loss should be below entry.");
    if (dir === "short" && s <= e) warns.push("For a short, the stop-loss should be above entry.");
  }
  if (hasTp && e > 0) {
    if (dir === "long" && t <= e) warns.push("For a long, take-profit should be above entry.");
    if (dir === "short" && t >= e) warns.push("For a short, take-profit should be below entry.");
  }
  if (risk > 5) warns.push("Risking more than 5% per trade is aggressive.");
  if (Number.isFinite(leverage) && leverage > 20) warns.push("Implied leverage is very high (> 20×).");
  if (
    riskState &&
    riskState.canOpen &&
    Number.isFinite(riskAmt) &&
    riskState.allowedRiskPerTrade > 0 &&
    riskAmt > riskState.allowedRiskPerTrade
  ) {
    warns.push(
      `Риск ${money(riskAmt)} превышает допустимый ${money(riskState.allowedRiskPerTrade)}${selExchange ? ` по бирже ${selExchange.name}` : ""}.`,
    );
  }

  return (
    <Page>
      <PageHeader
        title="Risk Calculator"
        subtitle="Position sizing from your account risk and stop-loss"
      />

      <Layout>
        <Panel style={{ gridArea: "trade" }}>
          <SectionTitle>Trade</SectionTitle>

          <SegRow>
            <Segment $active={dir === "long"} $tone="green" type="button" onClick={() => setDir("long")}>
              Long
            </Segment>
            <Segment $active={dir === "short"} $tone="red" type="button" onClick={() => setDir("short")}>
              Short
            </Segment>
          </SegRow>

          {blotterState && blotterState.exchanges.length > 0 && (
            <FieldWrap>
              <Label>Биржа (журнал)</Label>
              <Select value={selExId} onChange={(ev) => pickExchange(ev.target.value)}>
                <option value="">Вручную</option>
                {blotterState.exchanges.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            </FieldWrap>
          )}

          <FieldWrap>
            <Label>Account balance</Label>
            <InputWrap>
              <Affix>$</Affix>
              <Input inputMode="decimal" value={balance} onChange={(ev) => setBalance(ev.target.value)} placeholder="10000" />
            </InputWrap>
            {selExchange && (
              <Hint>
                из биржи {selExchange.name} (капитал ${selExchange.capital.toLocaleString("en-US")})
              </Hint>
            )}
          </FieldWrap>

          <FieldWrap>
            <Label>Risk per trade</Label>
            <InputWrap>
              <Input inputMode="decimal" value={riskPct} onChange={(ev) => changeRisk(ev.target.value)} placeholder="1" />
              <Affix $right>%</Affix>
            </InputWrap>
            <Chips>
              {RISK_PRESETS.map((p) => (
                <Chip key={p} $active={riskPct === p} type="button" onClick={() => changeRisk(p)}>
                  {p}%
                </Chip>
              ))}
              {riskState && riskState.allowedRiskPerTrade > 0 && bal > 0 && (
                <Chip
                  $active
                  type="button"
                  title="Подставить допустимый риск из лимитов"
                  onClick={() => changeRisk(((riskState.allowedRiskPerTrade / bal) * 100).toFixed(2))}
                >
                  Лимит {money(riskState.allowedRiskPerTrade)}
                </Chip>
              )}
            </Chips>
          </FieldWrap>

          <FieldWrap>
            <Label>Entry price</Label>
            <InputWrap>
              <Input inputMode="decimal" value={entry} onChange={(ev) => setEntry(ev.target.value)} placeholder="100" />
            </InputWrap>
          </FieldWrap>

          <FieldWrap>
            <Label>Stop-loss</Label>
            <InputWrap>
              <Input inputMode="decimal" value={stop} onChange={(ev) => setStop(ev.target.value)} placeholder="95" />
            </InputWrap>
          </FieldWrap>

          <FieldWrap>
            <Label>Take-profit (optional)</Label>
            <InputWrap>
              <Input inputMode="decimal" value={tp} onChange={(ev) => setTp(ev.target.value)} placeholder="110" />
            </InputWrap>
          </FieldWrap>
        </Panel>

        <Panel style={{ gridArea: "result" }}>
          <SectionTitle>Result</SectionTitle>

          <Hero>
            <HeroLabel>Position size</HeroLabel>
            <HeroValue>{valid ? `${units(size)} units` : "—"}</HeroValue>
            <HeroSub>
              {valid
                ? `≈ ${money(notional)} notional · ${pctStr((notional / bal) * 100)} от баланса`
                : "Enter balance, risk, entry & stop"}
            </HeroSub>
          </Hero>

          <StatRow>
            <StatLabel>Risk amount (max loss)</StatLabel>
            <StatValue $tone="red">{Number.isFinite(riskAmt) ? money(riskAmt) : "—"}</StatValue>
          </StatRow>

          {riskState && (
            <StatRow>
              <StatLabel>Макс. под лимит</StatLabel>
              <StatValue $tone="accent">
                {valid && riskState.allowedRiskPerTrade > 0
                  ? `${units(riskState.allowedRiskPerTrade / stopDist)} units`
                  : "—"}
                {valid && riskState.allowedRiskPerTrade > 0 && (
                  <StatSub>({money(riskState.allowedRiskPerTrade)})</StatSub>
                )}
              </StatValue>
            </StatRow>
          )}

          <StatRow>
            <StatLabel>Stop distance</StatLabel>
            <StatValue>
              {valid ? plain(stopDist) : "—"}
              {valid && <StatSub>({pctStr(stopPct)})</StatSub>}
            </StatValue>
          </StatRow>

          <StatRow>
            <StatLabel>Leverage</StatLabel>
            <StatValue $tone={Number.isFinite(leverage) && leverage > 20 ? "red" : "fg"}>
              {Number.isFinite(leverage) ? `${leverage.toFixed(2)}×` : "—"}
            </StatValue>
          </StatRow>

          <StatRow>
            <StatLabel>Reward : Risk</StatLabel>
            <StatValue $tone="accent">{Number.isFinite(rr) ? `${rr.toFixed(2)}R` : "—"}</StatValue>
          </StatRow>

          <StatRow>
            <StatLabel>Potential profit</StatLabel>
            <StatValue $tone="green">
              {Number.isFinite(profit) ? money(profit) : "—"}
              {Number.isFinite(profitPct) && <StatSub>(+{profitPct.toFixed(2)}%)</StatSub>}
            </StatValue>
          </StatRow>

          {warns.map((w) => (
            <Warn key={w}>⚠ {w}</Warn>
          ))}
        </Panel>

        <ChartArea>
          <SectionTitle $strong>График</SectionTitle>
        <ChartTop>
          <TickerCol>
            <Label>Тикер</Label>
            <InputWrap>
              <Input
                list="rc-tickers"
                value={symbol}
                placeholder="SPY"
                onChange={(ev) => setSymbol(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") loadNow();
                }}
              />
            </InputWrap>
            <datalist id="rc-tickers">
              {tickerOptions.map((sym) => (
                <option key={sym} value={sym} />
              ))}
            </datalist>
          </TickerCol>
          <IntervalChips>
            {INTERVALS.map((iv) => (
              <Chip key={iv} $active={interval === iv} type="button" onClick={() => changeInterval(iv)}>
                {iv}
              </Chip>
            ))}
          </IntervalChips>
          <Button $variant="secondary" type="button" onClick={loadNow}>
            Обновить
          </Button>
        </ChartTop>

        {lastPrice !== null && (
          <PriceRow>
            <span>
              Текущая цена: <PriceVal>{money(lastPrice)}</PriceVal>
            </span>
            <Chip $active type="button" onClick={() => setEntry(String(lastPrice))}>
              → во вход
            </Chip>
          </PriceRow>
        )}

          <RiskChart
            symbol={committedSymbol}
            interval={interval}
            entry={fin(e)}
            stop={fin(s)}
            tp={fin(t)}
            onLoaded={setLastPrice}
          />
        </ChartArea>

        {blotterState && blotterState.exchanges.length > 0 && (
          <Section style={{ gridArea: "limits" }}>
            <SectionTitle $strong>Проверка риск-лимитов</SectionTitle>

          {!riskState && (
            <Hint>Выберите биржу в поле «Биржа (журнал)» сверху, чтобы проверить сделку по лимитам.</Hint>
          )}

          {riskState && (
            <>
              <GateBanner $tone={gate ? (gate.allowed ? "green" : "red") : "muted"}>
                {gate
                  ? gate.allowed
                    ? `✅ Можно открыть сделку с риском ${money(gateRisk ?? 0)}`
                    : `⛔ ${gate.reason}`
                  : "Введите баланс, риск, вход и стоп — проверю сделку по лимитам."}
              </GateBanner>

              <StatRow>
                <StatLabel>Risk status</StatLabel>
                <StatValue $tone={statusTone(riskState.status)}>{riskState.status}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Allowed risk per trade</StatLabel>
                <StatValue $tone="accent">{money(riskState.allowedRiskPerTrade)}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Remaining daily risk</StatLabel>
                <StatValue>{money(riskState.remainingDailyRisk)}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Remaining weekly risk</StatLabel>
                <StatValue>{money(riskState.remainingWeeklyRisk)}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>P&L сегодня / неделя</StatLabel>
                <StatValue
                  $tone={riskState.totalPnLToday > 0 ? "green" : riskState.totalPnLToday < 0 ? "red" : "fg"}
                >
                  {money(riskState.totalPnLToday)} / {money(riskState.totalPnLWeek)}
                </StatValue>
              </StatRow>
            </>
          )}
        </Section>
      )}

        <Section style={{ gridArea: "rules" }}>
          <SectionTitle $strong>Правила риска</SectionTitle>
        <TipList>
          {RISK_RULES.map((r) => (
            <TipLi key={r}>{r}</TipLi>
          ))}
        </TipList>
        <Footnote>
          Расчёт в «единицах»: считается, что 1 единица даёт $1 P&amp;L на каждый $1 движения цены
          (акции, крипта, спот). Для форекса и фьючерсов масштабируй по стоимости пункта / тика.
        </Footnote>
        </Section>
      </Layout>
    </Page>
  );
}
