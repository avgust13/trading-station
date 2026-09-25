"use client";

import styled, { css, keyframes } from "styled-components";

import { Button, Footnote, Panel } from "@/components/ui";
import type { RefreshTrigger } from "@/lib/cache";
import { AUTO_REFRESH_LABEL, nextScheduledRefresh } from "@/lib/refreshSchedule";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DATE_TIME = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
/** The next slot is always within a week, so weekday + time is unambiguous. */
const WEEKDAY_TIME = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const RELATIVE = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
const RELATIVE_SHORT = new Intl.RelativeTimeFormat("ru", { numeric: "auto", style: "short" });

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "только что", "20 минут назад", "через 4 часа", "вчера", "через 2 дня"… */
function fmtRelative(t: number, now: number, rtf = RELATIVE): string {
  const diff = t - now;
  if (Math.abs(diff) < MINUTE) return diff < 0 ? "только что" : "сейчас";
  if (Math.abs(diff) < HOUR) return rtf.format(Math.trunc(diff / MINUTE), "minute");
  if (Math.abs(diff) < 12 * HOUR) return rtf.format(Math.trunc(diff / HOUR), "hour");
  // Beyond half a day, count calendar days so "завтра" really means tomorrow.
  return rtf.format(Math.round((startOfDay(t) - startOfDay(now)) / DAY), "day");
}

/** Snapshot freshness, shared by the header summary and the details panel. */
export interface DataStatusState {
  now: number;
  savedAt: number | null;
  trigger: RefreshTrigger | null;
  /** A scheduled slot has passed since `savedAt` (or there is no snapshot yet). */
  due: boolean;
  loading: boolean;
  error: string | null;
}

type Tone = "ok" | "busy" | "due" | "error";

function toneOf(s: DataStatusState): Tone {
  if (s.loading) return "busy";
  if (s.error) return "error";
  return s.due ? "due" : "ok";
}

const pulse = keyframes`
  50% {
    opacity: 0.3;
  }
`;

const Dot = styled.span<{ $tone: Tone }>`
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === "ok"
      ? theme.colors.green
      : $tone === "error"
        ? theme.colors.red
        : $tone === "due"
          ? theme.colors.warning
          : theme.colors.accent};
  ${({ $tone }) =>
    $tone === "busy" &&
    css`
      animation: ${pulse} 1s ease-in-out infinite;
    `}
`;

const Toggle = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
`;

const Chevron = styled.svg<{ $open: boolean }>`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: currentColor;
  transition: transform 150ms ease;
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
`;

function summaryText(s: DataStatusState): string {
  if (s.loading) return "Обновление…";
  if (s.error) return "Не удалось обновить";
  if (s.savedAt === null) return "Данные ещё не загружались";
  const updated = `Обновлено ${fmtRelative(s.savedAt, s.now, RELATIVE_SHORT)}`;
  return s.due ? updated : `${updated} · след. ${WEEKDAY_TIME.format(nextScheduledRefresh(s.now))}`;
}

/** One-line freshness summary for the page header; toggles the details panel. */
export function DataStatusToggle({
  status,
  open,
  onToggle,
  controls,
}: {
  status: DataStatusState;
  open: boolean;
  onToggle: () => void;
  /** Id of the details panel this button shows / hides. */
  controls: string;
}) {
  return (
    <Toggle
      type="button"
      $variant="secondary"
      $size="sm"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      title={open ? "Скрыть подробности" : "Подробнее об обновлении данных"}
    >
      <Dot $tone={toneOf(status)} />
      {summaryText(status)}
      <Chevron viewBox="0 0 24 24" aria-hidden="true" focusable="false" $open={open}>
        <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
      </Chevron>
    </Toggle>
  );
}

const Wrap = styled(Panel)`
  margin-bottom: 16px;
`;

const Items = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 40px;
`;

const ItemLabel = styled.div`
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.xs};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const ItemValue = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
`;

const ItemSub = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const ErrorLine = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.red};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

function Item({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <ItemLabel>{label}</ItemLabel>
      <ItemValue>{value}</ItemValue>
      {sub && <ItemSub>{sub}</ItemSub>}
    </div>
  );
}

const TRIGGER_LABEL: Record<RefreshTrigger, string> = {
  auto: "автоматически",
  manual: "вручную",
};

/** When the snapshot was pulled, when the next weekly pull is, and the source. */
export function DataStatusDetails({
  id,
  status,
  rowCount,
  retryMinutes,
}: {
  id: string;
  status: DataStatusState;
  rowCount: number;
  retryMinutes: number;
}) {
  const { now, savedAt, trigger, due, loading, error } = status;

  const updated =
    savedAt === null
      ? { value: "ещё не загружались" }
      : {
          value: DATE_TIME.format(savedAt),
          sub: [fmtRelative(savedAt, now), trigger && TRIGGER_LABEL[trigger]].filter(Boolean).join(" · "),
        };

  const next = loading
    ? { value: "идёт сейчас…", sub: "загружаем из Yahoo Finance" }
    : due
      ? { value: "как можно скорее", sub: `повтор каждые ${retryMinutes} мин или при появлении сети` }
      : { value: DATE_TIME.format(nextScheduledRefresh(now)), sub: fmtRelative(nextScheduledRefresh(now), now) };

  return (
    <Wrap id={id}>
      <Items>
        <Item label="Обновлено" value={updated.value} sub={updated.sub} />
        <Item label="Следующее автообновление" value={next.value} sub={next.sub} />
        <Item
          label="Источник"
          value="Yahoo Finance"
          sub={rowCount > 0 ? `инструментов: ${rowCount} · дневные свечи за 12 мес.` : undefined}
        />
      </Items>
      {error && <ErrorLine>Не удалось обновить данные: {error}</ErrorLine>}
      <Footnote>
        Автообновление — {AUTO_REFRESH_LABEL}. Если в это время компьютер был выключен или страница
        закрыта, данные подтянутся сразу при следующем открытии.
      </Footnote>
    </Wrap>
  );
}
