"use client";

import type { ReactNode } from "react";
import styled from "styled-components";

/**
 * Standard page header: an `h1` title, an optional muted subtitle, and an
 * optional right-aligned `actions` slot for page-level buttons. Replaces every
 * page's bespoke `Header/Title/Subtitle` trio. `children` render under the
 * subtitle (e.g. live status pills) — beside `actions` on wide screens, full
 * width on narrow ones.
 */
const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  grid-template-areas:
    "titles actions"
    "meta   actions";
  align-items: start;
  column-gap: 16px;
  margin-bottom: 18px;

  @media (max-width: 720px) {
    grid-template-areas:
      "titles actions"
      "meta   meta";
  }
`;

const Titles = styled.div`
  grid-area: titles;
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

const Meta = styled.div`
  grid-area: meta;
  min-width: 0;
  margin-top: 12px;
`;

const Actions = styled.div`
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Header>
      <Titles>
        <Title>{title}</Title>
        {subtitle != null && <Subtitle>{subtitle}</Subtitle>}
      </Titles>
      {children != null && <Meta>{children}</Meta>}
      {actions != null && <Actions>{actions}</Actions>}
    </Header>
  );
}
