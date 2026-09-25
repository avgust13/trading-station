// Weekly auto-refresh schedule for the Overview snapshot. There is no background
// job: the page checks on load, on focus and once a minute whether a scheduled
// slot has passed since the last save, so a slot missed while the computer was
// off (or the page was closed) is caught up as soon as the page is opened again.

/** Day of week (0 = Sunday) and local hour of the weekly refresh slot. */
export const AUTO_REFRESH_WEEKDAY = 0;
export const AUTO_REFRESH_HOUR = 0;
/** Human-readable form of the two constants above — keep in sync. */
export const AUTO_REFRESH_LABEL = "каждое воскресенье в 00:00";

/** The most recent slot at or before `now` (unix ms, local time). */
export function lastScheduledRefresh(now: number): number {
  const d = new Date(now);
  d.setHours(AUTO_REFRESH_HOUR, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - AUTO_REFRESH_WEEKDAY + 7) % 7));
  if (d.getTime() > now) d.setDate(d.getDate() - 7);
  return d.getTime();
}

/** The first slot strictly after `now`. */
export function nextScheduledRefresh(now: number): number {
  const d = new Date(lastScheduledRefresh(now));
  d.setDate(d.getDate() + 7);
  return d.getTime();
}

/** True when a slot has passed since the snapshot was saved. */
export function isRefreshDue(savedAt: number, now: number): boolean {
  return savedAt < lastScheduledRefresh(now);
}
