"use client";

import styled, { css, keyframes } from "styled-components";

import { Button } from "@/components/ui";

// Labeled refresh action built on the shared Button; the icon spins while a
// fetch is in flight. Lives in the Overview page header, next to the
// data-status toggle.
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Btn = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Icon = styled.svg<{ $spinning: boolean }>`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: currentColor;
  ${({ $spinning }) =>
    $spinning &&
    css`
      animation: ${spin} 0.9s linear infinite;
    `}
`;

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Btn type="button" $variant="primary" $size="sm" onClick={onClick} disabled={loading}>
      <Icon viewBox="0 0 24 24" aria-hidden="true" focusable="false" $spinning={loading}>
        <path d="M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V7a5 5 0 11-4.9 6h-2.02A7 7 0 1017.65 6.35z" />
      </Icon>
      {loading ? "Обновление…" : "Обновить"}
    </Btn>
  );
}
