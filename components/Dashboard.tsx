"use client";

import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { fetchData } from "@/lib/api";
import { loadCache, saveCache } from "@/lib/cache";
import type { ApiData } from "@/lib/types";
import { MarketTable } from "./MarketTable";
import { RefreshButton } from "./RefreshButton";
import { StatusBar } from "./StatusBar";

const BASE_BTN_TITLE = "Refresh data";

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
`;

const Card = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg};
  overflow-x: clip;
`;

interface StatusState {
  text: string;
  error: boolean;
  visible: boolean;
}

export function Dashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>({ text: "", error: false, visible: false });
  const [btnTitle, setBtnTitle] = useState(BASE_BTN_TITLE);

  // On load: show cached data only. A fresh fetch happens only on button click.
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setData(cached.data);
      const savedAt = new Date(cached.saved_at).toLocaleString();
      setBtnTitle(`Showing saved data from ${savedAt}. Click refresh to fetch live data.`);
    } else {
      setBtnTitle(BASE_BTN_TITLE);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setBtnTitle("Refreshing data...");
    setStatus({ text: "Fetching data from Yahoo Finance...", error: false, visible: true });
    setData(null);

    try {
      const fresh = await fetchData();
      setData(fresh);
      saveCache(fresh);

      const asOf = fresh.as_of ? `as of ${fresh.as_of}` : "as of latest response";
      const basisHint = fresh.rows.some((r) => r.price_basis === "live")
        ? "Today uses live quote when available."
        : "Today reflects latest close.";
      const loadedMsg = `Live data loaded (${asOf}). ${basisHint}`;
      setStatus({ text: loadedMsg, error: false, visible: false });
      setBtnTitle(loadedMsg);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus({ text: `Failed to load: ${message}`, error: true, visible: true });
      setBtnTitle(BASE_BTN_TITLE);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Wrap>
      <Card>
        <RefreshButton onClick={refresh} disabled={loading} spinning={loading} title={btnTitle} />
        {status.visible && <StatusBar $error={status.error}>{status.text}</StatusBar>}
        {data && data.rows.length > 0 && <MarketTable rows={data.rows} />}
      </Card>
    </Wrap>
  );
}
