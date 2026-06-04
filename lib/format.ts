// Number formatting + color classification, ported 1:1 from the original index.html.

export type Tone = "green" | "red" | "grey";

export function fmtPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtChg(v: number): string {
  const sign = v >= 0 ? "+" : "";
  if (Math.abs(v) >= 1000) return sign + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return sign + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function cls(v: number): Tone {
  if (v > 0.001) return "green";
  if (v < -0.001) return "red";
  return "grey";
}
