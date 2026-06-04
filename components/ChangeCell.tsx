"use client";

import styled from "styled-components";

import type { Tone } from "@/lib/format";

// A right-aligned monospace numeric cell, colored green / red / grey by tone.
export const ChangeCell = styled.td<{ $tone: Tone; $bold?: boolean }>`
  padding: 14px 12px;
  text-align: right;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 14px;
  white-space: nowrap;
  font-weight: ${({ $bold }) => ($bold ? 600 : 400)};
  color: ${({ theme, $tone }) =>
    $tone === "green"
      ? theme.colors.green
      : $tone === "red"
        ? theme.colors.red
        : theme.colors.muted};
`;
