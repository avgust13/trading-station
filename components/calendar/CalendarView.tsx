"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";

import {
  addDays,
  dayOfMonth,
  enDateMed,
  monthMatrix,
  monthTitle,
  ruDayLong,
  type TzMode,
  weekKeys,
} from "@/lib/calendar/datetime";
import { groupByDay } from "@/lib/calendar/insights";
import { theme } from "@/lib/theme";
import type { MarketEvent } from "@/lib/calendar/types";
import { DayGroup } from "./DayGroup";
import { EmptyState } from "./states";
import { markerColor, SectionTitle } from "./ui";

type View = "month" | "week" | "day" | "list";

const VIEWS: { key: View; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "list", label: "List" },
];

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MARKER_LEGEND: { c: string; label: string }[] = [
  { c: theme.event.high, label: "High" },
  { c: theme.event.medium, label: "Medium" },
  { c: theme.event.low, label: "Low" },
  { c: theme.event.earnings, label: "Earnings" },
  { c: theme.event.centralBank, label: "Central bank" },
  { c: theme.event.crypto, label: "Crypto" },
];

function ym(key: string): { y: number; m: number } {
  const [y, m] = key.split("-").map(Number);
  return { y, m: m - 1 };
}

/* --- styles --- */

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const Nav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavBtn = styled.button`
  appearance: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 16px;
  line-height: 1;

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const NavLabel = styled.div`
  min-width: 180px;
  text-align: center;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 15px;
  font-weight: 700;
`;

const Segmented = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  gap: 2px;
`;

const Seg = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  padding: 5px 11px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}26` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.fg : theme.colors.muted)};
  font-size: 12.5px;
  font-weight: 600;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
`;

const LegendItem = styled.span<{ $c: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $c }) => $c};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
`;

const WdRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
`;

const WdCell = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const DayCell = styled.button<{ $inMonth: boolean; $selected: boolean; $today: boolean }>`
  appearance: none;
  cursor: pointer;
  text-align: left;
  min-height: 64px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $selected, $today }) =>
      $selected ? theme.colors.accent : $today ? `${theme.colors.accent}77` : theme.colors.border};
  background: ${({ theme, $selected }) => ($selected ? `${theme.colors.accent}1a` : theme.colors.zebra)};
  opacity: ${({ $inMonth }) => ($inMonth ? 1 : 0.4)};
  display: flex;
  flex-direction: column;
  gap: 4px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const DomNum = styled.span<{ $today: boolean }>`
  color: ${({ theme, $today }) => ($today ? theme.colors.accent : theme.colors.fg)};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;
  font-weight: ${({ $today }) => ($today ? 700 : 600)};
`;

const Dots = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
`;

const Mdot = styled.span<{ $c: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
`;

const More = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 9px;
`;

const Detail = styled.div`
  margin-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 16px;
`;

export function CalendarView({
  events,
  tz,
  todayKey,
  onSelect,
}: {
  events: MarketEvent[];
  tz: TzMode;
  todayKey: string;
  onSelect: (e: MarketEvent) => void;
}) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => ym(todayKey));
  const [selected, setSelected] = useState(todayKey);

  const byDay = useMemo(() => groupByDay(events, tz), [events, tz]);
  const matrix = useMemo(() => monthMatrix(cursor.y, cursor.m), [cursor]);
  const cur = ym(todayKey);

  function selectDay(key: string) {
    setSelected(key);
    const k = ym(key);
    if (k.y !== cursor.y || k.m !== cursor.m) setCursor(k);
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const total = c.y * 12 + c.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }

  const monthCanBack = cursor.y * 12 + cursor.m > cur.y * 12 + cur.m;
  const weekStart = weekKeys(selected)[0];
  const weekCanBack = addDays(weekStart, -7) >= weekKeys(todayKey)[0];
  const dayCanBack = addDays(selected, -1) >= todayKey;

  /* --- adaptive navigation --- */
  let navLabel = monthTitle(cursor.y, cursor.m);
  let onPrev = () => shiftMonth(-1);
  let onNext = () => shiftMonth(1);
  let canBack = monthCanBack;

  if (view === "week") {
    const ks = weekKeys(selected);
    navLabel = `${enDateMed(ks[0])} — ${enDateMed(ks[6])}`;
    onPrev = () => selectDay(addDays(selected, -7));
    onNext = () => selectDay(addDays(selected, 7));
    canBack = weekCanBack;
  } else if (view === "day") {
    navLabel = ruDayLong(selected);
    onPrev = () => selectDay(addDays(selected, -1));
    onNext = () => selectDay(addDays(selected, 1));
    canBack = dayCanBack;
  }

  return (
    <div>
      <Toolbar>
        <Nav>
          <NavBtn type="button" onClick={onPrev} disabled={!canBack} aria-label="Previous">
            ‹
          </NavBtn>
          <NavLabel>{navLabel}</NavLabel>
          <NavBtn type="button" onClick={onNext} aria-label="Next">
            ›
          </NavBtn>
        </Nav>
        <Segmented role="group" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <Seg key={v.key} type="button" $active={view === v.key} onClick={() => setView(v.key)}>
              {v.label}
            </Seg>
          ))}
        </Segmented>
      </Toolbar>

      {view === "month" && (
        <>
          <Legend>
            {MARKER_LEGEND.map((l) => (
              <LegendItem key={l.label} $c={l.c}>
                {l.label}
              </LegendItem>
            ))}
          </Legend>
          <WdRow>
            {WD.map((d) => (
              <WdCell key={d}>{d}</WdCell>
            ))}
          </WdRow>
          <Grid>
            {matrix.flat().map((cell) => {
              const dayEvents = byDay.get(cell.key) ?? [];
              const dots = dayEvents.slice(0, 4);
              const extra = dayEvents.length - dots.length;
              return (
                <DayCell
                  key={cell.key}
                  type="button"
                  $inMonth={cell.inMonth}
                  $selected={cell.key === selected}
                  $today={cell.key === todayKey}
                  onClick={() => selectDay(cell.key)}
                >
                  <DomNum $today={cell.key === todayKey}>{dayOfMonth(cell.key)}</DomNum>
                  <Dots>
                    {dots.map((e) => (
                      <Mdot key={e.id} $c={markerColor(e)} />
                    ))}
                    {extra > 0 && <More>+{extra}</More>}
                  </Dots>
                </DayCell>
              );
            })}
          </Grid>
          <Detail>
            <SectionTitle>{ruDayLong(selected)}</SectionTitle>
            <DayGroup
              dateKey={selected}
              events={byDay.get(selected) ?? []}
              tz={tz}
              onSelect={onSelect}
              today={selected === todayKey}
            />
          </Detail>
        </>
      )}

      {view === "week" &&
        weekKeys(selected).map((key) => (
          <DayGroup
            key={key}
            dateKey={key}
            events={byDay.get(key) ?? []}
            tz={tz}
            onSelect={onSelect}
            today={key === todayKey}
          />
        ))}

      {view === "day" && (
        <DayGroup
          dateKey={selected}
          events={byDay.get(selected) ?? []}
          tz={tz}
          onSelect={onSelect}
          today={selected === todayKey}
        />
      )}

      {view === "list" &&
        (() => {
          const daysWithEvents = matrix
            .flat()
            .filter((c) => c.inMonth && (byDay.get(c.key)?.length ?? 0) > 0);
          if (daysWithEvents.length === 0)
            return <EmptyState title="В этом месяце событий нет" hint="Пролистай вперёд к следующему месяцу." />;
          return daysWithEvents.map((c) => (
            <DayGroup
              key={c.key}
              dateKey={c.key}
              events={byDay.get(c.key) ?? []}
              tz={tz}
              onSelect={onSelect}
              today={c.key === todayKey}
            />
          ));
        })()}
    </div>
  );
}
