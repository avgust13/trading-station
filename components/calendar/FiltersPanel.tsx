"use client";

import styled from "styled-components";

import { defaultFilters, hasActiveFilters, toggle } from "@/lib/calendar/filters";
import {
  ASSET_OPTIONS,
  type CalendarFilters,
  COUNTRY_FLAGS,
  COUNTRY_OPTIONS,
  type Country,
  type EventType,
  type Importance,
  IMPORTANCE_LABELS,
  IMPORTANCE_OPTIONS,
  type Market,
  MARKET_LABELS,
  MARKET_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
} from "@/lib/calendar/types";
import { importanceColor } from "./ui";

const Wrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.zebra};
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const SearchInput = styled.input`
  flex: 1;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 14px;
  padding: 9px 12px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.muted};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const ClearBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12.5px;
  font-weight: 600;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const Groups = styled.div`
  display: grid;
  gap: 8px;
`;

const Group = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

const GroupLabel = styled.span`
  flex: none;
  width: 76px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button<{ $active: boolean; $c: string }>`
  appearance: none;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ theme, $active, $c }) => ($active ? $c : theme.colors.border)};
  background: ${({ $active, $c }) => ($active ? `${$c}26` : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.fg : theme.colors.muted)};
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

interface ChipGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T[];
  labelOf: (v: T) => string;
  onToggle: (v: T) => void;
  colorOf?: (v: T) => string;
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  labelOf,
  onToggle,
  colorOf,
}: ChipGroupProps<T>) {
  return (
    <Group>
      <GroupLabel>{label}</GroupLabel>
      <Chips>
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <Chip
              key={o}
              type="button"
              $active={active}
              $c={colorOf ? colorOf(o) : "#60a5fa"}
              aria-pressed={active}
              onClick={() => onToggle(o)}
            >
              {labelOf(o)}
            </Chip>
          );
        })}
      </Chips>
    </Group>
  );
}

export function FiltersPanel({
  filters,
  onChange,
}: {
  filters: CalendarFilters;
  onChange: (f: CalendarFilters) => void;
}) {
  const patch = (p: Partial<CalendarFilters>) => onChange({ ...filters, ...p });

  return (
    <Wrap>
      <SearchRow>
        <SearchInput
          type="search"
          placeholder="Search events…  (CPI, Nvidia, FOMC, BTC)"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
        {hasActiveFilters(filters) && (
          <ClearBtn type="button" onClick={() => onChange(defaultFilters)}>
            Clear
          </ClearBtn>
        )}
      </SearchRow>

      <Groups>
        <ChipGroup<Country>
          label="Country"
          options={COUNTRY_OPTIONS}
          selected={filters.countries}
          labelOf={(c) => `${COUNTRY_FLAGS[c]} ${c}`}
          onToggle={(c) => patch({ countries: toggle(filters.countries, c) })}
        />
        <ChipGroup<Importance>
          label="Impact"
          options={IMPORTANCE_OPTIONS}
          selected={filters.importance}
          labelOf={(i) => IMPORTANCE_LABELS[i]}
          colorOf={(i) => importanceColor(i)}
          onToggle={(i) => patch({ importance: toggle(filters.importance, i) })}
        />
        <ChipGroup<Market>
          label="Market"
          options={MARKET_OPTIONS}
          selected={filters.markets}
          labelOf={(m) => MARKET_LABELS[m]}
          onToggle={(m) => patch({ markets: toggle(filters.markets, m) })}
        />
        <ChipGroup<EventType>
          label="Type"
          options={TYPE_OPTIONS}
          selected={filters.types}
          labelOf={(t) => TYPE_LABELS[t]}
          onToggle={(t) => patch({ types: toggle(filters.types, t) })}
        />
        <ChipGroup<string>
          label="Asset"
          options={ASSET_OPTIONS}
          selected={filters.assets}
          labelOf={(a) => a}
          onToggle={(a) => patch({ assets: toggle(filters.assets, a) })}
        />
      </Groups>
    </Wrap>
  );
}
