"use client";

import styled from "styled-components";

const Center = styled.div`
  display: grid;
  place-items: center;
  min-height: calc(100vh - 48px);
  padding: 40px 16px;
  text-align: center;
`;

const Title = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 20px;
  font-weight: 700;
`;

const Sub = styled.div`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

/** Simple empty-state panel for tabs that don't have content yet. */
export function Placeholder({ title }: { title: string }) {
  return (
    <Center>
      <div>
        <Title>{title}</Title>
        <Sub>Coming soon.</Sub>
      </div>
    </Center>
  );
}
