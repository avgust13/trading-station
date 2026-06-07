// Timezone-aware date helpers built on native Date + Intl (no dependencies).
//
// Strategy: every event carries a canonical UTC instant (`startsAt`). For a
// chosen timezone we derive a stable "day key" (YYYY-MM-DD as seen in that tz)
// and group / match everything by that string. Calendar cells and week days are
// plain calendar dates, also expressed as day keys, so matching is just string
// equality and is immune to DST edge cases.

export type TzMode = "local" | "newYork" | "london" | "utc";

export interface TzOption {
  mode: TzMode;
  label: string;
}

export const TZ_OPTIONS: TzOption[] = [
  { mode: "local", label: "Local" },
  { mode: "newYork", label: "New York" },
  { mode: "london", label: "London" },
  { mode: "utc", label: "UTC" },
];

const ZONE: Record<Exclude<TzMode, "local">, string> = {
  newYork: "America/New_York",
  london: "Europe/London",
  utc: "UTC",
};

/** Resolve a TzMode to an IANA zone id. "local" uses the runtime's zone. */
export function resolveTz(mode: TzMode): string {
  if (mode === "local") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }
  return ZONE[mode];
}

/** Human label for the resolved zone, e.g. "Asia/Tbilisi". */
export function tzLabel(mode: TzMode): string {
  return resolveTz(mode);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface Parts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

function partsInZone(date: Date, tz: string): Parts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
  };
}

/** "YYYY-MM-DD" for an instant as seen in the given tz mode. */
export function dayKey(iso: string | Date, mode: TzMode): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const p = partsInZone(date, resolveTz(mode));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:mm" for an instant as seen in the given tz mode. */
export function fmtTime(iso: string | Date, mode: TzMode): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const p = partsInZone(date, resolveTz(mode));
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/* --- day-key arithmetic (string dates, no tz involved) --- */

function keyToUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: string, n: number): string {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToKey(d);
}

/** 0 = Sunday … 6 = Saturday, for a day key. */
export function weekdayOf(key: string): number {
  return keyToUtc(key).getUTCDay();
}

/** Today's day key in the chosen tz. */
export function todayKey(mode: TzMode, now: Date = new Date()): string {
  return dayKey(now, mode);
}

/** Monday→Sunday day keys for the week containing `key`. */
export function weekKeys(key: string): string[] {
  const offset = (weekdayOf(key) + 6) % 7; // days since Monday
  const monday = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export interface MonthCell {
  key: string;
  inMonth: boolean;
}

/**
 * 6×7 matrix of day cells (Monday-first) covering `month` (0-11) of `year`,
 * padded with leading/trailing days from adjacent months.
 */
export function monthMatrix(year: number, month: number): MonthCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstKey = utcToKey(first);
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first padding
  const start = addDays(firstKey, -lead);
  const weeks: MonthCell[][] = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const [, m] = cursor.split("-").map(Number);
      row.push({ key: cursor, inMonth: m - 1 === month });
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

/* --- labels (built from a day key, anchored at UTC noon to avoid drift) --- */

function keyToNoonUtc(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

const RU_DAY_LONG = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const RU_DATE = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const EN_DATE_MED = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const EN_MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Понедельник, 8 июня" */
export function ruDayLong(key: string): string {
  return cap(RU_DAY_LONG.format(keyToNoonUtc(key)));
}

/** "7 июня 2026" (strips the trailing " г."). */
export function ruDate(key: string): string {
  return RU_DATE.format(keyToNoonUtc(key)).replace(/\s*г\.?$/, "");
}

/** "Jun 8, 2026" */
export function enDateMed(key: string): string {
  return EN_DATE_MED.format(keyToNoonUtc(key));
}

/** Day-of-month number from a key (e.g. "08" -> 8). */
export function dayOfMonth(key: string): number {
  return Number(key.split("-")[2]);
}

/** "June 2026" for the calendar month header. */
export function monthTitle(year: number, month: number): string {
  return EN_MONTH_YEAR.format(new Date(Date.UTC(year, month, 1)));
}
