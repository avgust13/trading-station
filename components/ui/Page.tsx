"use client";

import styled from "styled-components";

/**
 * Centered page wrapper shared by every tab. Standardizes max-width and the
 * `24px / gutter / 64px` padding rhythm so every page sits in the same canvas.
 */
export const Page = styled.div`
  max-width: ${({ theme }) => theme.layout.wide};
  margin: 0 auto;
  padding: 24px ${({ theme }) => theme.layout.gutter} 64px;
`;
