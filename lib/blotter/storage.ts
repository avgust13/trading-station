import type { BlotterState } from "./types";

// localStorage persistence, mirroring lib/cache.ts. Fills are tiny (~150 bytes
// each), so thousands fit comfortably under the quota.

const BLOTTER_KEY = "trading-station-blotter-v1";

export function emptyBlotterState(): BlotterState {
  return { version: 1, fills: [], tradeNotes: {} };
}

export function saveBlotter(state: BlotterState): void {
  try {
    localStorage.setItem(BLOTTER_KEY, JSON.stringify(state));
  } catch {
    // Keep the app usable if storage is blocked.
  }
}

export function loadBlotter(): BlotterState | null {
  try {
    const raw = localStorage.getItem(BLOTTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BlotterState>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.fills)) return null;
    return {
      version: 1,
      fills: parsed.fills,
      tradeNotes:
        parsed.tradeNotes && typeof parsed.tradeNotes === "object" ? parsed.tradeNotes : {},
    };
  } catch {
    return null;
  }
}
