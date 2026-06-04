import type { ApiData } from "./types";

// localStorage caching, ported from index.html. Only live data is cached; on
// reload the cached snapshot is shown until the user clicks refresh.

const CACHE_KEY = "weekly-market-report-cache-v1";

export interface CachedPayload {
  saved_at: number;
  data: ApiData;
}

export function saveCache(data: ApiData): void {
  if (!data || data.source !== "live") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ saved_at: Date.now(), data } satisfies CachedPayload),
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
