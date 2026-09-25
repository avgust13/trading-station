"use client";

import styled from "styled-components";

/** Container card for grouped content (form panels, filter panels, etc.). */
export const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px;
  background: ${({ theme }) => theme.colors.zebra};
`;
