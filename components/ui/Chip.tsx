"use client";

import styled, { css } from "styled-components";

export type ChipTone = "accent" | "green" | "red";
export type ChipSize = "sm" | "md";

const sizeStyles = (size: ChipSize = "sm") =>
  size === "md"
    ? css`
        padding: 8px 14px;
        font-size: ${({ theme }) => theme.fontSize.base};
      `
    : css`
        padding: 4px 10px;
        font-size: ${({ theme }) => theme.fontSize.sm};
      `;

/**
 * Pill-shaped toggle / action chip. Used for selection groups (risk presets,
 * chart intervals, calendar filters) and small accent actions. `$active`
 * renders the selected state; `$tone` colors it (accent default).
 */
export const Chip = styled.button<{ $active?: boolean; $tone?: ChipTone; $size?: ChipSize }>`
  appearance: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
  ${({ $size }) => sizeStyles($size)}

  border: 1px solid
    ${({ theme, $active, $tone = "accent" }) => ($active ? theme.colors[$tone] : theme.colors.border)};
  background: ${({ theme, $active, $tone = "accent" }) =>
    $active ? `${theme.colors[$tone]}${$tone === "accent" ? "1f" : "22"}` : "transparent"};
  color: ${({ theme, $active, $tone = "accent" }) =>
    $active ? ($tone === "accent" ? theme.colors.fg : theme.colors[$tone]) : theme.colors.muted};

  &:hover {
    ${({ theme, $active, $tone = "accent" }) =>
      $active
        ? css`
            background: ${`${theme.colors[$tone]}33`};
          `
        : css`
            color: ${theme.colors.fg};
            border-color: ${`${theme.colors.accent}88`};
          `}
  }
`;
