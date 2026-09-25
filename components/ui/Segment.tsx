"use client";

import styled from "styled-components";

export type SegmentTone = "accent" | "green" | "red";

/**
 * Rectangular segmented-control button (e.g. Long / Short). Typically rendered
 * in an equal-width grid. `$tone` colors the active state.
 */
export const Segment = styled.button<{ $active?: boolean; $tone?: SegmentTone }>`
  appearance: none;
  cursor: pointer;
  width: 100%;
  padding: 9px 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.fontSize.base};
  font-weight: 700;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
  border: 1px solid
    ${({ theme, $active, $tone = "accent" }) => ($active ? theme.colors[$tone] : theme.colors.border)};
  background: ${({ theme, $active, $tone = "accent" }) =>
    $active ? `${theme.colors[$tone]}22` : "transparent"};
  color: ${({ theme, $active, $tone = "accent" }) => ($active ? theme.colors[$tone] : theme.colors.muted)};
`;
