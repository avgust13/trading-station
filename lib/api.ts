import type { ApiData, ApiError } from "./types";

/** Fetch live market data from the API route. Mirrors the refresh() fetch in index.html. */
export async function fetchData(): Promise<ApiData> {
  const res = await fetch("/api/data");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = (await res.json()) as ApiData;
  if (data.source !== "live") {
    throw new Error("Server did not return live data.");
  }
  return data;
}
