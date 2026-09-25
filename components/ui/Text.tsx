"use client";

import styled from "styled-components";

/** Field label above an input. */
export const Label = styled.label`
  display: block;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  margin-bottom: 6px;
`;

/** Inline helper text below a field. */
export const Hint = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1.4;
`;

/** Block of explanatory fine print at the end of a section. */
export const Footnote = styled.div`
  margin-top: 14px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1.5;
`;
