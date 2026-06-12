import type { Fill } from "./types";

/**
 * Same fill pasted twice must produce the same id. A plain joined string is
 * deliberately used instead of a hash — readable in devtools and debuggable.
 */
export function fillFingerprint(
  f: Pick<Fill, "exchangeId" | "symbol" | "side" | "qty" | "price" | "executedAt">,
): string {
  return [
    f.exchangeId,
    f.symbol.toUpperCase(),
    f.side,
    f.qty.toFixed(4),
    f.price.toFixed(4),
    f.executedAt,
  ].join("|");
}
