import type { Direction, Fill, Side, Trade, TradeFill } from "./types";

// Position-based grouping: walk each symbol's fills chronologically keeping a
// signed position (+long / −short). The position leaving zero opens a trade,
// returning to zero closes it. A single fill that crosses zero (a flip, e.g.
// long 10 → sell 20 → short 10) is split into a closing slice and an opening
// slice, producing two trades.

/** Tolerance for fractional-share rounding. */
const EPS = 1e-9;

function slice(fill: Fill, qty: number): TradeFill {
  return {
    fillId: fill.id,
    side: fill.side,
    qty,
    price: fill.price,
    executedAt: fill.executedAt,
  };
}

function weightedAvg(fills: TradeFill[]): number {
  let notional = 0;
  let qty = 0;
  for (const f of fills) {
    notional += f.qty * f.price;
    qty += f.qty;
  }
  return qty > EPS ? notional / qty : 0;
}

function sumQty(fills: TradeFill[]): number {
  return fills.reduce((s, f) => s + f.qty, 0);
}

interface OpenTrade {
  id: string;
  symbol: string;
  direction: Direction;
  entries: TradeFill[];
  exits: TradeFill[];
  openedAt: string;
}

function finalize(t: OpenTrade, closedAt: string | null): Trade {
  const qtyOpened = sumQty(t.entries);
  const qtyClosed = sumQty(t.exits);
  const avgEntry = weightedAvg(t.entries);
  const avgExit = t.exits.length > 0 ? weightedAvg(t.exits) : null;
  const matchedQty = Math.min(qtyOpened, qtyClosed);
  const dirSign = t.direction === "long" ? 1 : -1;
  const realizedPnl = avgExit === null ? 0 : (avgExit - avgEntry) * matchedQty * dirSign;
  const entryNotional = avgEntry * matchedQty;
  return {
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    entries: t.entries,
    exits: t.exits,
    qtyOpened,
    avgEntry,
    avgExit,
    openedAt: t.openedAt,
    closedAt,
    status: closedAt === null ? "open" : "closed",
    realizedPnl,
    realizedPnlPct: entryNotional > EPS ? (realizedPnl / entryNotional) * 100 : 0,
  };
}

function signedQty(side: Side, qty: number): number {
  return side === "buy" ? qty : -qty;
}

/** Stable chronological sort: executedAt, then importedAt, then id. */
function sortFills(fills: Fill[]): Fill[] {
  return [...fills].sort(
    (a, b) =>
      a.executedAt.localeCompare(b.executedAt) ||
      a.importedAt.localeCompare(b.importedAt) ||
      a.id.localeCompare(b.id),
  );
}

export function groupFills(fills: Fill[]): Trade[] {
  const bySymbol = new Map<string, Fill[]>();
  for (const f of sortFills(fills)) {
    const key = f.symbol.toUpperCase();
    const list = bySymbol.get(key);
    if (list) list.push(f);
    else bySymbol.set(key, [f]);
  }

  const trades: Trade[] = [];

  for (const [symbol, symbolFills] of bySymbol) {
    let position = 0; // signed: +long / −short
    let trade: OpenTrade | null = null;

    for (const fill of symbolFills) {
      let remaining = signedQty(fill.side, fill.qty);

      while (Math.abs(remaining) > EPS) {
        if (Math.abs(position) < EPS || trade === null) {
          // Flat → this slice opens a new trade.
          trade = {
            id: fill.id,
            symbol,
            direction: remaining > 0 ? "long" : "short",
            entries: [],
            exits: [],
            openedAt: fill.executedAt,
          };
          position = 0;
        }

        const sameDirection =
          (trade.direction === "long") === remaining > 0;

        if (sameDirection) {
          // Increases the position → entry; consumes the whole remainder.
          trade.entries.push(slice(fill, Math.abs(remaining)));
          position += remaining;
          remaining = 0;
        } else {
          // Reduces the position → exit; consumes at most |position|.
          const closeQty = Math.min(Math.abs(remaining), Math.abs(position));
          trade.exits.push(slice(fill, closeQty));
          const sign = remaining > 0 ? 1 : -1;
          position += sign * closeQty;
          remaining -= sign * closeQty;
          if (Math.abs(position) < EPS) {
            trades.push(finalize(trade, fill.executedAt));
            trade = null;
            position = 0;
            // If `remaining` is still nonzero this was a flip — the loop
            // continues and opens the opposite trade.
          }
        }
      }
    }

    if (trade !== null) trades.push(finalize(trade, null));
  }

  return trades.sort((a, b) => b.openedAt.localeCompare(a.openedAt) || a.id.localeCompare(b.id));
}
