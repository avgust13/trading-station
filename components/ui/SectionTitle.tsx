"use client";

import styled from "styled-components";

/**
 * Uppercase mini-heading used above panels and in-page sections. `$strong`
 * switches from muted to foreground for emphasized section dividers.
 */
export const SectionTitle = styled.div<{ $strong?: boolean }>`
  color: ${({ theme, $strong }) => ($strong ? theme.colors.fg : theme.colors.muted)};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
`;
