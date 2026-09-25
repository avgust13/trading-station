"use client";

import type { ReactNode } from "react";
import styled from "styled-components";

/**
 * Standard page header: an `h1` title, an optional muted subtitle, and an
 * optional right-aligned `actions` slot for page-level buttons. Replaces every
 * page's bespoke `Header/Title/Subtitle` trio.
 */
const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`;

const Titles = styled.div`
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: ${({ theme }) => theme.fontSize.title};
  font-weight: 700;
`;

const Subtitle = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.base};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Header>
      <Titles>
        <Title>{title}</Title>
        {subtitle != null && <Subtitle>{subtitle}</Subtitle>}
      </Titles>
      {actions != null && <Actions>{actions}</Actions>}
    </Header>
  );
}
