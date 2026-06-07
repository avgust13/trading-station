"use client";

import styled, { keyframes } from "styled-components";

/* ----------------------------------------------------------------------------
 * Loading skeleton
 * -------------------------------------------------------------------------- */

const shimmer = keyframes`
  0% { opacity: 0.45; }
  50% { opacity: 0.8; }
  100% { opacity: 0.45; }
`;

const SkeletonWrap = styled.div`
  display: grid;
  gap: 12px;
`;

const SkeletonCard = styled.div`
  height: 92px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  animation: ${shimmer} 1.3s ease-in-out infinite;
`;

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonWrap aria-busy="true" aria-label="Loading events">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </SkeletonWrap>
  );
}

/* ----------------------------------------------------------------------------
 * Empty / error states
 * -------------------------------------------------------------------------- */

const Center = styled.div`
  display: grid;
  place-items: center;
  text-align: center;
  padding: 48px 16px;
`;

const Icon = styled.div`
  font-size: 30px;
  margin-bottom: 10px;
`;

const Title = styled.div`
  color: ${({ theme }) => theme.colors.fg};
  font-size: 16px;
  font-weight: 700;
`;

const Hint = styled.div`
  margin-top: 6px;
  max-width: 420px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 1.5;
`;

const Action = styled.button`
  margin-top: 14px;
  appearance: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => `${theme.colors.accent}1f`};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;
  font-weight: 600;
`;

export function EmptyState({
  title = "Нет событий",
  hint = "По выбранным фильтрам ничего не найдено.",
  actionLabel,
  onAction,
}: {
  title?: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Center>
      <div>
        <Icon>📭</Icon>
        <Title>{title}</Title>
        <Hint>{hint}</Hint>
        {actionLabel && onAction && (
          <Action type="button" onClick={onAction}>
            {actionLabel}
          </Action>
        )}
      </div>
    </Center>
  );
}

const ErrorCenter = styled(Center)``;

const ErrorTitle = styled(Title)`
  color: ${({ theme }) => theme.colors.red};
`;

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ErrorCenter>
      <div>
        <Icon>⚠️</Icon>
        <ErrorTitle>Не удалось загрузить события</ErrorTitle>
        <Hint>{message}</Hint>
        {onRetry && (
          <Action type="button" onClick={onRetry}>
            Повторить
          </Action>
        )}
      </div>
    </ErrorCenter>
  );
}
