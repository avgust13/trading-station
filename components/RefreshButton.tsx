"use client";

import styled from "styled-components";

const Button = styled.button<{ $spinning?: boolean }>`
  position: fixed;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.2);
  color: ${({ theme }) => theme.colors.accent};
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 20;
  transition:
    background 120ms ease,
    transform 150ms ease;
  transform: rotate(${({ $spinning }) => ($spinning ? 180 : 0)}deg);

  &:hover:not(:disabled) {
    background: rgba(147, 197, 253, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
`;

interface Props {
  onClick: () => void;
  disabled: boolean;
  spinning: boolean;
  title: string;
}

export function RefreshButton({ onClick, disabled, spinning, title }: Props) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      $spinning={spinning}
      title={title}
      aria-label="Refresh data"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V7a5 5 0 11-4.9 6h-2.02A7 7 0 1017.65 6.35z" />
      </svg>
    </Button>
  );
}
