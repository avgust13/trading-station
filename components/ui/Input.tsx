"use client";

import styled from "styled-components";

/**
 * Text-input group. Wrap an `<Input>` (and optional `<Affix>` prefix/suffix)
 * in `<InputWrap>`; the wrapper draws the border and accent focus ring.
 * `<Select>` is the matching dropdown.
 */
export const InputWrap = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg};
  overflow: hidden;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

export const Affix = styled.span<{ $right?: boolean }>`
  padding: ${({ $right }) => ($right ? "0 12px 0 8px" : "0 8px 0 12px")};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

export const Input = styled.input`
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSize.lg};
  padding: 10px 12px;
`;

export const Select = styled.select`
  width: 100%;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-size: ${({ theme }) => theme.fontSize.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;
