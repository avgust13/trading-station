"use client";

// Calendar-specific color mapping + badge wrappers. The layout atoms (Page,
// SectionTitle, Panel) now live in the shared ui layer and are re-exported here
// so the calendar panels keep importing them from "./ui" unchanged.

import { Badge } from "@/components/ui";
import {
  CONFIRMATION_LABELS,
  IMPORTANCE_LABELS,
  type Confirmation,
  type Importance,
  type MarketEvent,
  TYPE_LABELS,
} from "@/lib/calendar/types";
import { theme } from "@/lib/theme";

export { Page, SectionTitle, Panel } from "@/components/ui";

/* --- color mapping (static theme, no provider needed) --- */

/** Marker/border color: category overrides impact (earnings/CB/crypto), else impact. */
export function markerColor(e: Pick<MarketEvent, "type" | "importance">): string {
  if (e.type === "earnings") return theme.event.earnings;
  if (e.type === "central_bank") return theme.event.centralBank;
  if (e.type === "crypto") return theme.event.crypto;
  return importanceColor(e.importance);
}

export function importanceColor(i: Importance): string {
  return i === "high" ? theme.event.high : i === "medium" ? theme.event.medium : theme.event.low;
}

/* --- badges (backed by the shared Badge primitive) --- */

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <Badge color={importanceColor(importance)} dot>
      {IMPORTANCE_LABELS[importance]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: MarketEvent["type"] }) {
  return <Badge>{TYPE_LABELS[type]}</Badge>;
}

const CONFIRMATION_COLOR: Record<Confirmation, string> = {
  confirmed: theme.colors.green,
  estimated: theme.colors.accent,
  tentative: theme.event.medium,
  unknown: theme.colors.muted,
};

export function ConfirmationBadge({ confirmation }: { confirmation: Confirmation }) {
  // Confirmed is the default expectation — only flag the uncertain ones.
  if (confirmation === "confirmed") return null;
  return <Badge color={CONFIRMATION_COLOR[confirmation]}>{CONFIRMATION_LABELS[confirmation]}</Badge>;
}
