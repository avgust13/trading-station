"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchData } from "@/lib/api";
import { loadCache, saveCache, type RefreshTrigger } from "@/lib/cache";
import { isRefreshDue } from "@/lib/refreshSchedule";
import type { ApiData } from "@/lib/types";
import { Page, PageHeader } from "@/components/ui";
import { DataStatusDetails, DataStatusToggle, type DataStatusState } from "./DataStatus";
import { MarketTable } from "./MarketTable";
import { RefreshButton } from "./RefreshButton";
import { StatusBar } from "./StatusBar";

/** How often the open page re-checks the weekly schedule (and ticks the relative times). */
const TICK_MS = 60_000;
/** After a failed automatic pull, wait this long before the next automatic attempt. */
const RETRY_MINUTES = 5;
const DETAILS_ID = "data-status-details";

export function Dashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [trigger, setTrigger] = useState<RefreshTrigger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Null until mounted, so the server and first client render match.
  const [now, setNow] = useState<number | null>(null);
  // Data-status details start collapsed on every load.
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mirrors read by the scheduler, which runs from timers and window events.
  const savedAtRef = useRef<number | null>(null);
  const loadingRef = useRef(false);
  const failedAtRef = useRef(0);

  // The current table stays on screen while a new snapshot loads.
  const refresh = useCallback(async (how: RefreshTrigger) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchData();
      const at = Date.now();
      saveCache(fresh, at, how);
      savedAtRef.current = at;
      failedAtRef.current = 0;
      setData(fresh);
      setSavedAt(at);
      setTrigger(how);
    } catch (e) {
      failedAtRef.current = Date.now();
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  /** Pull if a weekly slot has passed since the last save; `force` skips the retry back-off. */
  const checkSchedule = useCallback(
    (force = false) => {
      const t = Date.now();
      setNow(t);
      if (loadingRef.current) return;
      if (!force && t - failedAtRef.current < RETRY_MINUTES * 60_000) return;
      const at = savedAtRef.current;
      if (at === null || isRefreshDue(at, t)) void refresh("auto");
    },
    [refresh],
  );

  // Show the saved snapshot instantly, then check the schedule: on load (which
  // catches up a slot missed while the computer was off), every minute while
  // the page is open, and whenever it regains focus or the network comes back.
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setData(cached.data);
      // Snapshots saved before rows carried mini-chart data are re-pulled right away.
      if (cached.data.rows.every((r) => r.spark !== undefined)) {
        savedAtRef.current = cached.saved_at;
        setSavedAt(cached.saved_at);
        setTrigger(cached.trigger ?? null);
      }
    }
    checkSchedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") checkSchedule();
    };
    const onOnline = () => checkSchedule(true);
    const timer = window.setInterval(() => checkSchedule(), TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [checkSchedule]);

  const status: DataStatusState | null =
    now === null
      ? null
      : {
          now,
          savedAt,
          trigger,
          due: savedAt === null || isRefreshDue(savedAt, now),
          loading,
          error,
        };

  return (
    <Page>
      <PageHeader
        title="Overview"
        subtitle="Live market snapshot from Yahoo Finance"
        actions={
          status && (
            <>
              <DataStatusToggle
                status={status}
                open={detailsOpen}
                onToggle={() => setDetailsOpen((o) => !o)}
                controls={DETAILS_ID}
              />
              <RefreshButton onClick={() => void refresh("manual")} loading={loading} />
            </>
          )
        }
      />
      {status && detailsOpen && (
        <DataStatusDetails
          id={DETAILS_ID}
          status={status}
          rowCount={data?.rows.length ?? 0}
          retryMinutes={RETRY_MINUTES}
        />
      )}
      {!data && loading && <StatusBar>Загружаем данные из Yahoo Finance…</StatusBar>}
      {data && data.rows.length > 0 && <MarketTable rows={data.rows} />}
    </Page>
  );
}
