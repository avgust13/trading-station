"use client";

import styled from "styled-components";

export type StatTone = "fg" | "green" | "red" | "accent";

/** A label/value row with a hairline divider, for key/value stat readouts. */
export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.base};
`;

export const StatValue = styled.div<{ $tone?: StatTone }>`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  text-align: right;
  color: ${({ theme, $tone }) =>
    $tone === "green"
      ? theme.colors.green
      : $tone === "red"
        ? theme.colors.red
        : $tone === "accent"
          ? theme.colors.accent
          : theme.colors.fg};
`;

export const StatSub = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-weight: 400;
  font-size: ${({ theme }) => theme.fontSize.sm};
  margin-left: 6px;
`;
