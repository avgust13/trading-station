"use client";

import styled, { css } from "styled-components";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const sizeStyles = (size: ButtonSize = "md") => {
  switch (size) {
    case "sm":
      return css`
        padding: 7px 12px;
        font-size: ${({ theme }) => theme.fontSize.sm};
      `;
    case "lg":
      return css`
        padding: 10px 16px;
        font-size: ${({ theme }) => theme.fontSize.base};
      `;
    default:
      return css`
        padding: 9px 14px;
        font-size: ${({ theme }) => theme.fontSize.base};
      `;
  }
};

const variantStyles = (variant: ButtonVariant = "secondary") => {
  switch (variant) {
    case "primary":
      return css`
        border: 1px solid ${({ theme }) => theme.colors.accent};
        background: ${({ theme }) => `${theme.colors.accent}22`};
        color: ${({ theme }) => theme.colors.accent};
        font-weight: 700;
        &:hover:not(:disabled) {
          background: ${({ theme }) => `${theme.colors.accent}33`};
        }
      `;
    case "danger":
      return css`
        border: 1px solid ${({ theme }) => theme.colors.border};
        background: transparent;
        color: ${({ theme }) => theme.colors.muted};
        &:hover:not(:disabled) {
          color: ${({ theme }) => theme.colors.red};
          border-color: ${({ theme }) => `${theme.colors.red}55`};
        }
      `;
    case "ghost":
      return css`
        border: 1px solid transparent;
        background: transparent;
        color: ${({ theme }) => theme.colors.muted};
        &:hover:not(:disabled) {
          color: ${({ theme }) => theme.colors.fg};
        }
      `;
    default:
      return css`
        border: 1px solid ${({ theme }) => theme.colors.border};
        background: transparent;
        color: ${({ theme }) => theme.colors.muted};
        &:hover:not(:disabled) {
          color: ${({ theme }) => theme.colors.fg};
          border-color: ${({ theme }) => `${theme.colors.accent}88`};
        }
      `;
  }
};

/**
 * Standard rectangular action button. Consolidates the per-page Import /
 * Secondary / Clear / Load buttons into one variant+size API.
 */
export const Button = styled.button<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  appearance: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
  ${({ $size }) => sizeStyles($size)}
  ${({ $variant }) => variantStyles($variant)}

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
