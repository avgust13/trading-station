"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";

import { Badge, Card, Page, PageHeader, SectionTitle, Select } from "@/components/ui";

/* ----------------------------------------------------------------------------
 * Session data. Each session is anchored to its home exchange's local hours
 * (so DST is handled automatically) and projected onto the viewer's selected
 * time zone at render time. Russian notes/hints are from the user's trading brief.
 * -------------------------------------------------------------------------- */

type SessionKey = "asia" | "london" | "newyork";
type RowKey = SessionKey | "overlap";

interface SessionInfo {
  key: SessionKey;
  name: string;
  ru: string;
  tz: string; // home IANA zone
  open: number; // local hours in `tz`
  close: number;
  color: string;
  assets: string;
  notes: string[];
  look: string;
}

const SESSIONS: SessionInfo[] = [
  {
    key: "asia",
    name: "Asia",
    ru: "Азия",
    tz: "Asia/Tokyo",
    open: 8,
    close: 17,
    color: "#22d3ee",
    assets: "JPY · AUD · NZD · азиатские индексы",
    notes: [
      "Движение спокойнее, чем в Европе и США",
      "Хорошо работает range / боковая торговля",
      "Важна для USD/JPY, AUD/USD, NZD/USD",
    ],
    look: "Формируется дневной диапазон — отметь его верх и низ.",
  },
  {
    key: "london",
    name: "London",
    ru: "Лондон",
    tz: "Europe/London",
    open: 8,
    close: 16.5,
    color: "#60a5fa",
    assets: "EUR · GBP · CHF",
    notes: [
      "Часто начинается сильное движение дня, высокая ликвидность",
      "Пробивает азиатский диапазон",
      "Хорошо видны тренды и ложные пробои",
    ],
    look: "Пробой азиатского диапазона — настоящий breakout или ложный (false breakout).",
  },
  {
    key: "newyork",
    name: "New York",
    ru: "Нью-Йорк",
    tz: "America/New_York",
    open: 9.5,
    close: 16,
    color: "#f59e0b",
    assets: "USD · индексы США · золото · нефть",
    notes: [
      "Самая сильная волатильность на открытии США",
      "Важные новости: CPI, NFP, FOMC, ставки ФРС",
      "Первые 1–2 часа после открытия NYSE — резкие",
    ],
    look: "Подтверждение или разворот движения Лондона.",
  },
];

interface RowDef {
  key: RowKey;
  name: string;
  color: string;
  overlap?: boolean;
}

/** London ∩ New York — computed from the two sessions, not stored. */
const OVERLAP: RowDef = { key: "overlap", name: "Overlap", color: "#f43f5e", overlap: true };

const ROWS: RowDef[] = [...SESSIONS.map(({ key, name, color }) => ({ key, name, color })), OVERLAP];

const PLAYBOOK: { num: number; color: string; html: { name: string; rest: string } }[] = [
  { num: 1, color: "#22d3ee", html: { name: "Азия", rest: " формирует диапазон — цена ходит в боковике." } },
  { num: 2, color: "#60a5fa", html: { name: "Лондон", rest: " пробивает диапазон — настоящий breakout или ложный пробой." } },
  { num: 3, color: "#f59e0b", html: { name: "Нью-Йорк", rest: " подтверждает или разворачивает — продолжение тренда или резкий reversal." } },
];

const EXAMPLE = [
  "Ночью BTC или EUR/USD ходит между 100 и 105.",
  "На открытии Лондона цена пробивает 105.",
  "Сильный объём и импульс → может начаться тренд.",
  "Быстрый возврат обратно → возможно false breakout.",
];

const ASSETS: { name: string; win: string }[] = [
  { name: "EUR/USD", win: "Лондон + Нью-Йорк" },
  { name: "GBP/USD", win: "Лондон + Нью-Йорк" },
  { name: "USD/JPY", win: "Азия + Нью-Йорк" },
  { name: "Gold · XAU/USD", win: "Лондон + Нью-Йорк" },
  { name: "NASDAQ · S&P 500", win: "Открытие США" },
  { name: "Crypto", win: "24/7, сильнее в США" },
  { name: "Oil", win: "Европа + США" },
];

/** Key trading windows, relative to the session opens they hang off. */
function keyWindows(spans: Record<SessionKey, Span>): { time: string; label: string }[] {
  const lon = spans.london.start;
  const ny = spans.newyork.start;
  return [
    { time: fmtRange({ start: lon, end: lon + 2 }), label: "Старт Лондона — первый пробой азиатского диапазона" },
    { time: fmtRange({ start: ny, end: ny + 2.5 }), label: "Открытие США + overlap — пик волатильности" },
    { time: `после ${fmtH(ny + 2.5)}`, label: "Продолжение тренда или затухание движения" },
  ];
}

/* ----------------------------------------------------------------------------
 * Viewer time zones. Offsets are read live from Intl, so DST is always right.
 * The choice is remembered per browser (guarded: private mode just no-ops).
 * -------------------------------------------------------------------------- */

const ZONE_LIST: { tz: string; city: string }[] = [
  { tz: "Pacific/Honolulu", city: "Гонолулу" },
  { tz: "America/Anchorage", city: "Анкоридж" },
  { tz: "America/Los_Angeles", city: "Лос-Анджелес" },
  { tz: "America/Denver", city: "Денвер" },
  { tz: "America/Chicago", city: "Чикаго" },
  { tz: "America/New_York", city: "Нью-Йорк" },
  { tz: "America/Sao_Paulo", city: "Сан-Паулу" },
  { tz: "UTC", city: "Всемирное время" },
  { tz: "Europe/London", city: "Лондон" },
  { tz: "Europe/Berlin", city: "Берлин / Франкфурт" },
  { tz: "Europe/Kyiv", city: "Киев" },
  { tz: "Europe/Istanbul", city: "Стамбул" },
  { tz: "Europe/Moscow", city: "Москва" },
  { tz: "Asia/Tbilisi", city: "Тбилиси" },
  { tz: "Asia/Dubai", city: "Дубай" },
  { tz: "Asia/Yekaterinburg", city: "Екатеринбург" },
  { tz: "Asia/Tashkent", city: "Ташкент" },
  { tz: "Asia/Almaty", city: "Алматы" },
  { tz: "Asia/Kolkata", city: "Мумбаи" },
  { tz: "Asia/Novosibirsk", city: "Новосибирск" },
  { tz: "Asia/Bangkok", city: "Бангкок" },
  { tz: "Asia/Hong_Kong", city: "Гонконг" },
  { tz: "Asia/Singapore", city: "Сингапур" },
  { tz: "Asia/Tokyo", city: "Токио" },
  { tz: "Australia/Sydney", city: "Сидней" },
  { tz: "Asia/Vladivostok", city: "Владивосток" },
  { tz: "Pacific/Auckland", city: "Окленд" },
];

const DEFAULT_TZ = "Asia/Tbilisi";
const LS_TZ = "sessions.tz";

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: string): void {
  try {
    window.localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

const GRID_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ----------------------------------------------------------------------------
 * Time helpers
 * -------------------------------------------------------------------------- */

/** Hours in the viewer's day; `end` may run past 24 when a span crosses midnight. */
interface Span {
  start: number;
  end: number;
}

const FMT = new Map<string, Intl.DateTimeFormat>();
function fmtFor(tz: string): Intl.DateTimeFormat {
  let f = FMT.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    FMT.set(tz, f);
  }
  return f;
}

// Drop any zone this runtime's tz database doesn't know, instead of crashing.
const ZONES = ZONE_LIST.filter((z) => {
  try {
    fmtFor(z.tz);
    return true;
  } catch {
    return false;
  }
});

/** Minutes east of UTC for `tz` at instant `at`. */
function tzOffsetMin(tz: string, at: Date): number {
  const parts = fmtFor(tz).formatToParts(at);
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

function hoursFloat(d: Date): number {
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}
function mod24(h: number): number {
  return ((h % 24) + 24) % 24;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function pct(h: number): number {
  return (h / 24) * 100;
}
function fmtH(h: number): string {
  const m = ((Math.round(h * 60) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
function fmtRange(sp: Span): string {
  return `${fmtH(sp.start)}–${fmtH(sp.end)}`;
}
function fmtOffset(min: number): string {
  if (min === 0) return "UTC";
  const a = Math.abs(min);
  return `UTC${min > 0 ? "+" : "−"}${Math.floor(a / 60)}${a % 60 ? `:${pad(a % 60)}` : ""}`;
}
function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
/** Whole minutes (rounded up, never 0) until view-hour `target` next comes round. */
function minsUntil(target: number, h: number): number {
  return Math.ceil((mod24(target - h) || 24) * 60);
}
function inSpan(sp: Span, h: number): boolean {
  return (h >= sp.start && h < sp.end) || (h + 24 >= sp.start && h + 24 < sp.end);
}
/** Split a span at midnight into bar segments on the 0–24 axis. */
function segments(sp: Span): { from: number; to: number; cut?: "left" | "right" }[] {
  if (sp.end <= 24) return [{ from: sp.start, to: sp.end }];
  return [
    { from: sp.start, to: 24, cut: "right" },
    { from: 0, to: sp.end - 24, cut: "left" },
  ];
}

interface View {
  offset: number; // viewer zone, minutes east of UTC
  local: Date; // viewer wall-clock time — read it via getUTC*
  h: number;
  spans: Record<SessionKey, Span>;
  overlap: Span | null;
}

/** Project every session onto the viewer's zone at instant `at`. */
function project(at: Date, viewTz: string): View {
  const offset = tzOffsetMin(viewTz, at);
  const toView = (u: Span): Span => {
    const start = mod24(u.start + offset / 60);
    return { start, end: start + (u.end - u.start) };
  };
  // Unwrapped UTC hours, so London/NY can be intersected directly.
  const utc = Object.fromEntries(
    SESSIONS.map((s) => {
      const off = tzOffsetMin(s.tz, at) / 60;
      return [s.key, { start: s.open - off, end: s.close - off }];
    }),
  ) as Record<SessionKey, Span>;
  const ov = {
    start: Math.max(utc.london.start, utc.newyork.start),
    end: Math.min(utc.london.end, utc.newyork.end),
  };
  const local = new Date(at.getTime() + offset * 60_000);
  return {
    offset,
    local,
    h: hoursFloat(local),
    spans: {
      asia: toView(utc.asia),
      london: toView(utc.london),
      newyork: toView(utc.newyork),
    },
    overlap: ov.end > ov.start ? toView(ov) : null,
  };
}

function nextOpen(spans: Record<SessionKey, Span>, h: number): { name: string; at: string; inMin: number } {
  return SESSIONS.map((s) => ({
    name: s.ru,
    at: fmtH(spans[s.key].start),
    inMin: minsUntil(spans[s.key].start, h),
  })).reduce((a, b) => (b.inMin < a.inMin ? b : a));
}

/* ----------------------------------------------------------------------------
 * Styles
 * -------------------------------------------------------------------------- */

const GUTTER = 120;
const PAD_X = 16;
const PAD_TOP = 30;
const ROWS_H = ROWS.length * 46;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const Clock = styled.div`
  text-align: right;
`;

const ClockTime = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

const ClockDate = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  margin-top: 2px;
`;

const TzSelect = styled(Select)`
  width: auto;
  max-width: 220px;
  margin-top: 8px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
`;

/**
 * Single flex item inside a Badge, so inline `<b>` times don't pick up the
 * badge gap. May wrap, so a long pill still fits a phone-width row.
 */
const StatusText = styled.span`
  white-space: normal;

  b {
    color: ${({ theme }) => theme.colors.fg};
    font-weight: 700;
  }
`;

const PlotScroll = styled.div`
  overflow-x: auto;
`;

const Plot = styled.div`
  position: relative;
  min-width: 580px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: ${PAD_TOP}px ${PAD_X}px 10px;
  background: ${({ theme }) => theme.colors.bg};
`;

const Rows = styled.div`
  position: relative;
  z-index: 1;
`;

const Row = styled.div`
  display: flex;
  align-items: stretch;
  height: 46px;
`;

const Gutter = styled.div`
  width: ${GUTTER}px;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 12px;
`;

const GName = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  font-weight: 700;
`;

const GRange = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11px;
`;

const LiveDot = styled.span<{ $c: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
  box-shadow: 0 0 8px ${({ $c }) => $c};
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

const Track = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
`;

const Bar = styled.div<{ $color: string; $active: boolean; $overlap: boolean; $cut?: "left" | "right" }>`
  position: absolute;
  top: ${({ $overlap }) => ($overlap ? 15 : 9)}px;
  bottom: ${({ $overlap }) => ($overlap ? 15 : 9)}px;
  border-radius: ${({ $cut }) => ($cut === "right" ? "6px 0 0 6px" : $cut === "left" ? "0 6px 6px 0" : "6px")};
  background: ${({ $color, $active }) => ($active ? $color : `${$color}3d`)};
  box-shadow: ${({ $active, $color }) =>
    $active ? `0 0 0 1px ${$color}, 0 0 14px ${$color}66` : "none"};
  transition:
    background 200ms ease,
    box-shadow 200ms ease;
`;

const Overlay = styled.div`
  position: absolute;
  left: ${PAD_X + GUTTER}px;
  right: ${PAD_X}px;
  top: ${PAD_TOP}px;
  height: ${ROWS_H}px;
  pointer-events: none;
  z-index: 2;
`;

const GridLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => theme.colors.border};
  transform: translateX(-0.5px);
`;

const Now = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  width: 0;
`;

const NowLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  transform: translateX(-1px);
  background: ${({ theme }) => theme.colors.fg};
  box-shadow: 0 0 8px rgba(229, 231, 235, 0.5);
`;

const NowDot = styled.div`
  position: absolute;
  top: -5px;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.fg};
  box-shadow: 0 0 10px rgba(229, 231, 235, 0.7);
`;

const NowTag = styled.div`
  position: absolute;
  top: -25px;
  left: 0;
  transform: translateX(-50%);
  padding: 1px 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.fg};
  color: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
`;

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-left: ${GUTTER}px;
  margin-top: 6px;
`;

const AxisLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 10px;
`;

/* --- session cards --- */

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  margin-top: 20px;
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardName = styled.span`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 15px;
  font-weight: 700;
`;

const CardEn = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

const CardLive = styled.span<{ $c: string }>`
  margin-left: auto;
  color: ${({ $c }) => $c};
  font-size: 11px;
  font-weight: 700;
`;

const CardTime = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11px;
`;

const CardAssets = styled.div`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12px;

  b {
    color: ${({ theme }) => theme.colors.muted};
    font-weight: 600;
  }
`;

const NoteList = styled.ul`
  margin: 8px 0 0;
  padding-left: 16px;
  list-style: disc;
`;

const NoteLi = styled.li`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.5;
  margin: 2px 0;
`;

const Look = styled.div`
  margin-top: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  background: rgba(96, 165, 250, 0.08);
  border-left: 2px solid ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.45;

  b {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

/* --- overlap callout --- */

const CalloutTitle = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 14px;
  font-weight: 700;
`;

const CalloutText = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.55;
`;

/* --- generic section --- */

const Section = styled.div`
  margin-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 16px;
`;

/* --- playbook --- */

const Step = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 8px 0;
`;

const StepNum = styled.div<{ $c: string }>`
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ $c }) => `${$c}22`};
  border: 1px solid ${({ $c }) => $c};
  color: ${({ $c }) => $c};
  font-size: 12px;
  font-weight: 700;
`;

const StepText = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.5;
  padding-top: 2px;

  b {
    font-weight: 700;
  }
`;

const Example = styled.div`
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.zebra};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ExampleTitle = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const ExampleLi = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.6;
`;

/* --- assets table --- */

const Assets = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2px 24px;
`;

const AssetRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const AssetName = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  font-weight: 600;
`;

const AssetWin = styled.div`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  text-align: right;
`;

/* --- key windows + tip --- */

const WindowItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 6px 0;
`;

const WTime = styled.div`
  flex: none;
  width: 110px;
  color: ${({ theme }) => theme.colors.accent};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  font-weight: 600;
`;

const WLabel = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
`;

const Tip = styled.div`
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid ${({ theme }) => `${theme.colors.accent}55`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  line-height: 1.55;

  b {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const Note = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 1.5;
`;

/* ----------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */

export function Sessions() {
  const [now, setNow] = useState<Date | null>(null);
  const [tz, setTz] = useState(DEFAULT_TZ);

  useEffect(() => {
    const saved = lsGet(LS_TZ);
    if (saved && ZONES.some((z) => z.tz === saved)) setTz(saved);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const changeTz = (next: string) => {
    setTz(next);
    lsSet(LS_TZ, next);
  };

  // Dropdown labels carry live offsets; they only change at DST switches, so
  // recompute hourly rather than every tick.
  const hourKey = now ? Math.floor(now.getTime() / 3_600_000) : null;
  const zoneOpts = useMemo(() => {
    if (hourKey == null) return ZONES.map((z) => ({ ...z, label: z.city }));
    const at = new Date(hourKey * 3_600_000);
    return ZONES.map((z) => ({ ...z, offset: tzOffsetMin(z.tz, at) }))
      .sort((a, b) => a.offset - b.offset)
      .map((z) => ({ ...z, label: `${fmtOffset(z.offset)} · ${z.city}` }));
  }, [hourKey]);

  const view = now ? project(now, tz) : null;
  const local = view?.local ?? null;
  const h = view?.h ?? null;
  const spanOf = (k: RowKey): Span | null => (!view ? null : k === "overlap" ? view.overlap : view.spans[k]);
  const activeSessions = view ? SESSIONS.filter((s) => inSpan(view.spans[s.key], view.h)) : [];
  const inOverlap = Boolean(view?.overlap && inSpan(view.overlap, view.h));
  const next = view ? nextOpen(view.spans, view.h) : null;
  const offLabel = view ? fmtOffset(view.offset) : "";
  const city = ZONES.find((z) => z.tz === tz)?.city ?? tz;

  return (
    <Page>
      <PageHeader
        title="Market Sessions"
        subtitle="When the major markets are open"
        actions={
          <Clock>
            <ClockTime>
              {local
                ? `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`
                : "––:––:––"}
            </ClockTime>
            <ClockDate>
              {local ? `${WEEKDAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()}` : " "}
            </ClockDate>
            <TzSelect value={tz} onChange={(e) => changeTz(e.target.value)} aria-label="Часовой пояс">
              {zoneOpts.map((z) => (
                <option key={z.tz} value={z.tz}>
                  {z.label}
                </option>
              ))}
            </TzSelect>
          </Clock>
        }
      >
        <StatusRow>
          {view &&
            activeSessions.map((s) => {
              const end = view.spans[s.key].end;
              return (
                <Badge key={s.key} color={s.color} size="md">
                  <StatusText>
                    ● {s.ru} — закроется в <b>{fmtH(end)}</b> · через {fmtDur(minsUntil(end, view.h))}
                  </StatusText>
                </Badge>
              );
            })}
          {view?.overlap && inOverlap && (
            <Badge color={OVERLAP.color} size="md">
              <StatusText>
                ⚡ Overlap — пик волатильности до <b>{fmtH(view.overlap.end)}</b> · ещё{" "}
                {fmtDur(minsUntil(view.overlap.end, view.h))}
              </StatusText>
            </Badge>
          )}
          {now && activeSessions.length === 0 && <Badge size="md">Тихо — между сессиями</Badge>}
          {next && (
            <Badge size="md">
              <StatusText>
                Дальше: {next.name} откроется в <b>{next.at}</b> · через {fmtDur(next.inMin)}
              </StatusText>
            </Badge>
          )}
        </StatusRow>
      </PageHeader>

      <PlotScroll>
        <Plot>
          <Rows>
            {ROWS.map((s) => {
              const sp = spanOf(s.key);
              const active = sp != null && h != null && inSpan(sp, h);
              return (
                <Row key={s.key}>
                  <Gutter>
                    <GName>
                      {s.name}
                      {active && <LiveDot $c={s.color} />}
                    </GName>
                    <GRange>{sp ? fmtRange(sp) : "––:––"}</GRange>
                  </Gutter>
                  <Track>
                    {sp &&
                      segments(sp).map((seg) => (
                        <Bar
                          key={seg.from}
                          $color={s.color}
                          $active={active}
                          $overlap={Boolean(s.overlap)}
                          $cut={seg.cut}
                          style={{ left: `${pct(seg.from)}%`, width: `${pct(seg.to) - pct(seg.from)}%` }}
                        />
                      ))}
                  </Track>
                </Row>
              );
            })}
          </Rows>

          <Overlay>
            {GRID_HOURS.map((gh) => (
              <GridLine key={gh} style={{ left: `${pct(gh)}%` }} />
            ))}
            {local && h != null && (
              <Now style={{ left: `${pct(h)}%` }}>
                <NowTag>{`${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`}</NowTag>
                <NowDot />
                <NowLine />
              </Now>
            )}
          </Overlay>

          <Axis>
            {GRID_HOURS.map((gh) => (
              <AxisLabel key={gh}>{pad(gh % 24)}:00</AxisLabel>
            ))}
          </Axis>
        </Plot>
      </PlotScroll>

      <Cards>
        {SESSIONS.map((s) => {
          const sp = view?.spans[s.key];
          const active = activeSessions.includes(s);
          return (
            <Card key={s.key} $accent={s.color} $active={active}>
              <CardHead>
                <CardName>{s.ru}</CardName>
                <CardEn>{s.name}</CardEn>
                {active && <CardLive $c={s.color}>● сейчас</CardLive>}
              </CardHead>
              <CardTime>{sp ? `${fmtRange(sp)} · ${offLabel}` : "––:––"}</CardTime>
              <CardAssets>
                <b>Активы:</b> {s.assets}
              </CardAssets>
              <NoteList>
                {s.notes.map((n) => (
                  <NoteLi key={n}>{n}</NoteLi>
                ))}
              </NoteList>
              <Look>
                <b>Что искать:</b> {s.look}
              </Look>
            </Card>
          );
        })}
      </Cards>

      <Card $accent={OVERLAP.color} $active={inOverlap} $tint style={{ marginTop: 14 }}>
        <CalloutTitle>
          ⚡ Лондон + Нью-Йорк (overlap)
          {view?.overlap ? ` · ${fmtRange(view.overlap)}` : ""}
          {inOverlap ? " · идёт сейчас" : ""}
        </CalloutTitle>
        <CalloutText>
          Одновременно торгуют Европа и США — самая высокая ликвидность дня. Сильные движения по
          EUR/USD, GBP/USD, XAU/USD, NASDAQ, S&amp;P 500; часто breakout или reversal. Один из лучших
          периодов для внутридневной торговли.
        </CalloutText>
      </Card>

      <Section>
        <SectionTitle $strong>Как торговать</SectionTitle>
        {PLAYBOOK.map((p) => (
          <Step key={p.num}>
            <StepNum $c={p.color}>{p.num}</StepNum>
            <StepText>
              <b>{p.html.name}</b>
              {p.html.rest}
            </StepText>
          </Step>
        ))}
        <Example>
          <ExampleTitle>Пример</ExampleTitle>
          {EXAMPLE.map((e) => (
            <ExampleLi key={e}>• {e}</ExampleLi>
          ))}
        </Example>
      </Section>

      <Section>
        <SectionTitle $strong>Лучшее время по активам</SectionTitle>
        <Assets>
          {ASSETS.map((a) => (
            <AssetRow key={a.name}>
              <AssetName>{a.name}</AssetName>
              <AssetWin>{a.win}</AssetWin>
            </AssetRow>
          ))}
        </Assets>
      </Section>

      <Section>
        <SectionTitle $strong>
          Ключевые окна ({city}
          {view ? `, ${offLabel}` : ""})
        </SectionTitle>
        {(view ? keyWindows(view.spans) : []).map((w) => (
          <WindowItem key={w.time}>
            <WTime>{w.time}</WTime>
            <WLabel>{w.label}</WLabel>
          </WindowItem>
        ))}
        <Tip>
          <b>Совет:</b> новичку лучше не торговать весь день — выбери 1–2 окна и наблюдай, как ведёт
          себя цена именно там.
        </Tip>
        <Note>
          Сессии привязаны к местному времени бирж (Токио, Лондон, Нью-Йорк) и сами учитывают переход
          на летнее время. Акции и форекс не торгуются по выходным; крипта — 24/7.
        </Note>
      </Section>
    </Page>
  );
}
