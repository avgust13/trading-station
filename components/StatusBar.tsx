"use client";

import styled from "styled-components";

// Centered status / error line shown while fetching or on failure.
export const StatusBar = styled.div<{ $error?: boolean }>`
  padding: 16px 12px;
  color: ${({ theme, $error }) => ($error ? theme.colors.red : theme.colors.muted)};
  font-size: 14px;
  text-align: center;
`;
