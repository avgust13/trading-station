import type { ApiData } from "./types";

// localStorage caching, ported from index.html. Only live data is cached; on
// reload the cached snapshot is shown until the weekly schedule
// (lib/refreshSchedule.ts) or the refresh button pulls a new one.

const CACHE_KEY = "weekly-market-report-cache-v1";

/** How a snapshot was pulled: by the weekly schedule or the refresh button. */
export type RefreshTrigger = "auto" | "manual";

export interface CachedPayload {
  saved_at: number;
  data: ApiData;
  /** Absent in snapshots saved before the weekly schedule existed. */
  trigger?: RefreshTrigger;
}

export function saveCache(data: ApiData, savedAt: number, trigger: RefreshTrigger): void {
  if (!data || data.source !== "live") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ saved_at: savedAt, data, trigger } satisfies CachedPayload),
    );
  } catch {
    // Keep the app usable if storage is blocked.
  }
}

export function loadCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPayload>;
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.rows)) return null;
    return parsed as CachedPayload;
  } catch {
    return null;
  }
}
