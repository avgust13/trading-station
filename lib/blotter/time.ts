// Wall-clock time in a named IANA zone → canonical ISO UTC instant.
//
// Same Intl.formatToParts technique as lib/calendar/datetime.ts: take the
// wall-clock fields as a UTC guess, observe what that instant looks like in
// the target zone, and correct by the difference. A second pass handles DST
// transitions where the first correction lands on the other side of the jump.

interface ZoneParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsInZone(date: Date, tz: string): ZoneParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
    second: Number(map.second),
  };
}

function partsToUtcMs(p: ZoneParts): number {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Compose an ISO UTC instant from a calendar date ("YYYY-MM-DD"), a wall-clock
 * time ("HH:MM" or "HH:MM:SS") and an IANA zone id. Returns null on bad input.
 */
export function composeUtcInstant(dateKey: string, time: string, ianaZone: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const wanted: ZoneParts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: Number(timeMatch[3] ?? "0"),
  };
  if (wanted.hour > 23 || wanted.minute > 59 || wanted.second > 59) return null;

  const wantedMs = partsToUtcMs(wanted);
  let guess = wantedMs;
  // Two correction passes: the second covers DST boundaries.
  for (let i = 0; i < 2; i++) {
    try {
      const observed = partsToUtcMs(partsInZone(new Date(guess), ianaZone));
      const diff = wantedMs - observed;
      if (diff === 0) break;
      guess += diff;
    } catch {
      return null;
    }
  }
  return new Date(guess).toISOString();
}
