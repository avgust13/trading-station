"use client";

import styled from "styled-components";

const Wrap = styled.footer`
  margin-top: 32px;
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 1.6;
`;

const Line = styled.p`
  margin: 0 0 6px;

  &:last-child {
    margin-bottom: 0;
  }
`;

/** Educational-only disclaimer (EN + RU), required at the bottom of the page. */
export function Disclaimer() {
  return (
    <Wrap>
      <Line>
        This dashboard is for educational and informational purposes only. It is not financial advice.
        Market reactions can differ from historical patterns. Always manage risk.
      </Line>
      <Line>
        Информация предоставляется только в образовательных целях и не является финансовой
        рекомендацией. Реакция рынка может отличаться от ожидаемой. Всегда контролируйте риск.
      </Line>
    </Wrap>
  );
}
