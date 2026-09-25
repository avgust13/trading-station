"use client";

import type { CSSProperties, ReactNode } from "react";
import styled, { css } from "styled-components";

export type BadgeSize = "sm" | "md";

/**
 * Pill badge. Pass `color` for a tinted (bg/border) variant; omit it for a
 * neutral muted variant. `dot` prepends a colored indicator. Consolidates the
 * calendar importance/type/confirmation badges and the sessions pills.
 */
const Base = styled.span<{ $color?: string; $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 600;
  white-space: nowrap;
  ${({ $size }) =>
    $size === "md"
      ? css`
          padding: 5px 11px;
          font-size: ${({ theme }) => theme.fontSize.sm};
        `
      : css`
          padding: 2px 8px;
          font-size: ${({ theme }) => theme.fontSize.xs};
        `}
  ${({ theme, $color }) =>
    $color
      ? css`
          background: ${`${$color}1f`};
          border: 1px solid ${`${$color}66`};
          color: ${theme.colors.fg};
        `
      : css`
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.muted};
        `}
`;

const Dot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

export function Badge({
  color,
  size = "sm",
  dot,
  className,
  style,
  children,
}: {
  color?: string;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Base $color={color} $size={size} className={className} style={style}>
      {dot && color && <Dot $color={color} />}
      {children}
    </Base>
  );
}
