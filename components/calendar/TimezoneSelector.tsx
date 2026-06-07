"use client";

import styled from "styled-components";

import { TZ_OPTIONS, type TzMode } from "@/lib/calendar/datetime";

const Wrap = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  gap: 2px;
`;

const Seg = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  padding: 6px 12px;
  border: none;
  border-radius: 7px;
  background: ${({ theme, $active }) => ($active ? `${theme.colors.accent}26` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.fg : theme.colors.muted)};
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 120ms ease,
    color 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

export function TimezoneSelector({
  value,
  onChange,
}: {
  value: TzMode;
  onChange: (mode: TzMode) => void;
}) {
  return (
    <Wrap role="group" aria-label="Timezone">
      {TZ_OPTIONS.map((o) => (
        <Seg
          key={o.mode}
          type="button"
          $active={value === o.mode}
          aria-pressed={value === o.mode}
          onClick={() => onChange(o.mode)}
        >
          {o.label}
        </Seg>
      ))}
    </Wrap>
  );
}
