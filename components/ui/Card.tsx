"use client";

import styled, { css } from "styled-components";

/**
 * List-item card. Optional props:
 *  - `$accent`  — a color string; adds a 3px left marker border.
 *  - `$active`  — selected/live state (solid accent border + glow).
 *  - `$tint`    — fill the card with a faint wash of `$accent` (callout style).
 *  - `$interactive` — pointer cursor + hover ring (for clickable cards).
 *
 * Render as a button with `as="button"`; the base resets make that safe.
 * Consolidates the calendar EventCard and the sessions Card/Callout.
 */
export const Card = styled.div<{
  $accent?: string;
  $active?: boolean;
  $tint?: boolean;
  $interactive?: boolean;
}>`
  display: block;
  width: 100%;
  text-align: left;
  appearance: none;
  font: inherit;
  border: 1px solid
    ${({ theme, $accent, $active, $tint }) =>
      $accent && ($active || $tint) ? ($active ? $accent : `${$accent}66`) : theme.colors.border};
  ${({ $accent }) =>
    $accent &&
    css`
      border-left: 3px solid ${$accent};
    `}
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  background: ${({ theme, $accent, $tint }) => ($tint && $accent ? `${$accent}14` : theme.colors.zebra)};
  ${({ $accent, $active }) =>
    $accent &&
    $active &&
    css`
      box-shadow: 0 0 16px ${`${$accent}40`};
    `}
  ${({ theme, $accent, $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease;
      &:hover {
        border-color: ${$accent ?? theme.colors.accent};
        box-shadow: 0 0 0 1px ${`${$accent ?? theme.colors.accent}55`};
      }
      &:focus-visible {
        outline: 2px solid ${$accent ?? theme.colors.accent};
        outline-offset: 2px;
      }
    `}
`;
