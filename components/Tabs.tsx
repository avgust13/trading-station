"use client";

import { useState } from "react";
import styled from "styled-components";

import { Dashboard } from "./Dashboard";
import { Placeholder } from "./Placeholder";

type TabKey = "overview" | "sessions" | "reporting" | "risk";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "sessions", label: "Sessions" },
  { key: "reporting", label: "Reporting" },
  { key: "risk", label: "Risk" },
];

const Bar = styled.nav`
  display: flex;
  align-items: stretch;
  height: 48px;
  padding: 0 8px;
  background: ${({ theme }) => theme.colors.bg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 14px;
  appearance: none;
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.colors.accent : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.fg : theme.colors.muted)};
  font-family: ${({ theme }) => theme.fonts.sans};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

export function Tabs() {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <>
      <Bar>
        {TABS.map((t) => (
          <TabButton
            key={t.key}
            type="button"
            $active={active === t.key}
            aria-current={active === t.key ? "page" : undefined}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </TabButton>
        ))}
      </Bar>
      {active === "overview" && <Dashboard />}
      {active === "sessions" && <Placeholder title="Sessions" />}
      {active === "reporting" && <Placeholder title="Reporting" />}
      {active === "risk" && <Placeholder title="Risk" />}
    </>
  );
}
