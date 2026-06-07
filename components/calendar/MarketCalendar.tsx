"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { ruDate, todayKey as resolveTodayKey, tzLabel, type TzMode } from "@/lib/calendar/datetime";
import { applyFilters, defaultFilters } from "@/lib/calendar/filters";
import { provider } from "@/lib/calendar/provider";
import type { CalendarFilters, MarketEvent } from "@/lib/calendar/types";

import { CalendarView } from "./CalendarView";
import { Disclaimer } from "./Disclaimer";
import { EarningsPanel } from "./EarningsPanel";
import { EventDetailsModal } from "./EventDetailsModal";
import { FiltersPanel } from "./FiltersPanel";
import { ImportantPanel } from "./ImportantPanel";
import { ErrorState, LoadingSkeleton } from "./states";
import { TimezoneSelector } from "./TimezoneSelector";
import { TodayPanel } from "./TodayPanel";
import { Page } from "./ui";
import { WeekPanel } from "./WeekPanel";

type SubTab = "today" | "week" | "calendar" | "earnings" | "important";

const SUBTABS: { key: SubTab; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "week", label: "Эта неделя" },
  { key: "calendar", label: "Календарь" },
  { key: "earnings", label: "Отчётности" },
  { key: "important", label: "Важные события" },
];

const RANGE_END = new Date("2027-12-31T23:59:59Z");
const RANGE_BACK_MS = 3 * 24 * 3600 * 1000; // include very recent releases

const Header = styled.div`
  margin-bottom: 14px;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 24px;
  font-weight: 800;
`;

const Subtitle = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const DateLine = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;

  b {
    font-weight: 700;
  }
  span {
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const TabBar = styled.nav`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 16px 0;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}1f` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.fg : theme.colors.muted)};
  font-size: 13px;
  font-weight: 600;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

export function MarketCalendar() {
  const [tz, setTz] = useState<TzMode>("local");
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);
  const [tab, setTab] = useState<SubTab>("today");
  const [selected, setSelected] = useState<MarketEvent | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const n = new Date();
    setNow(n);
    setLoading(true);
    setError(null);
    try {
      const evts = await provider.getEvents({
        start: new Date(n.getTime() - RANGE_BACK_MS),
        end: RANGE_END,
      });
      setEvents(evts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const todayKey = now ? resolveTodayKey(tz, now) : "";
  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);

  return (
    <Page>
      <Header>
        <Title>Market News Calendar</Title>
        <Subtitle>Следи за событиями, которые могут двигать рынок</Subtitle>
        <MetaRow>
          <DateLine>
            <b>Сегодня:</b> {todayKey ? ruDate(todayKey) : "—"} <span>· Часовой пояс: {tzLabel(tz)}</span>
          </DateLine>
          <TimezoneSelector value={tz} onChange={setTz} />
        </MetaRow>
      </Header>

      <TabBar>
        {SUBTABS.map((t) => (
          <TabBtn
            key={t.key}
            type="button"
            $active={tab === t.key}
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </TabBtn>
        ))}
      </TabBar>

      <FiltersPanel filters={filters} onChange={setFilters} />

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <>
          {tab === "today" && (
            <TodayPanel events={filtered} tz={tz} todayKey={todayKey} onSelect={setSelected} />
          )}
          {tab === "week" && (
            <WeekPanel events={filtered} tz={tz} todayKey={todayKey} onSelect={setSelected} />
          )}
          {tab === "calendar" && (
            <CalendarView events={filtered} tz={tz} todayKey={todayKey} onSelect={setSelected} />
          )}
          {tab === "earnings" && (
            <EarningsPanel events={filtered} tz={tz} todayKey={todayKey} onSelect={setSelected} />
          )}
          {tab === "important" && (
            <ImportantPanel events={filtered} tz={tz} todayKey={todayKey} onSelect={setSelected} />
          )}
        </>
      )}

      <EventDetailsModal event={selected} tz={tz} onClose={() => setSelected(null)} />
      <Disclaimer />
    </Page>
  );
}
