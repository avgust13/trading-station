"use client";

import styled from "styled-components";

/**
 * Circular icon button. `$variant="accent"` (default) gives the tinted accent
 * background used by the dashboard refresh control; `ghost` is transparent.
 */
export const IconButton = styled.button<{ $variant?: "accent" | "ghost" }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.accent};
  background: ${({ theme, $variant = "accent" }) =>
    $variant === "accent" ? `${theme.colors.accent}33` : "transparent"};
  transition: background 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => `${theme.colors.accent}4d`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
