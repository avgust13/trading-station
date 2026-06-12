// Money/quantity formatting for the blotter (USD-denominated journal).

export function fmtMoney(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtQty(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
