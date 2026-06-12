"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";

import { fillFingerprint } from "@/lib/blotter/fingerprint";
import { composeUtcInstant } from "@/lib/blotter/time";
import type { Fill, ParsedFill, Side } from "@/lib/blotter/types";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
`;

const Th = styled.th`
  padding: 6px 6px;
  text-align: left;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 5px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: middle;
`;

const Input = styled.input<{ $w?: number }>`
  width: ${({ $w }) => $w ?? 80}px;
  padding: 5px 7px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12.5px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const Select = styled.select`
  padding: 5px 6px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
`;

const Tag = styled.span<{ $tone: "warn" | "muted" }>`
  display: inline-block;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tone }) => ($tone === "warn" ? "#f59e0b" : theme.colors.muted)};
  background: ${({ $tone, theme }) => ($tone === "warn" ? "#f59e0b1a" : `${theme.colors.muted}1a`)};
`;

const NotesStrip = styled.div`
  margin-bottom: 12px;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid #f59e0b55;
  background: #f59e0b14;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 12.5px;
  line-height: 1.5;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
`;

const PrimaryBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => `${theme.colors.accent}22`};
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) => `${theme.colors.accent}33`};
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const GhostBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  font-weight: 600;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

interface RowDraft {
  included: boolean;
  /** Manually toggled by the user — stop auto-managing the checkbox. */
  touched: boolean;
  symbol: string;
  side: Side;
  qty: string;
  price: string;
  time: string;
  date: string | null;
  status: string | null;
}

function isFilledStatus(status: string | null): boolean {
  if (status === null || status.trim() === "") return true;
  return /fill|исполн/i.test(status);
}

interface RowComputed {
  iso: string | null;
  id: string | null;
  duplicate: boolean;
  valid: boolean;
}

function computeRow(row: RowDraft, dateKey: string, zone: string, existingIds: Set<string>): RowComputed {
  const qty = parseFloat(row.qty);
  const price = parseFloat(row.price);
  const iso = composeUtcInstant(row.date ?? dateKey, row.time, zone);
  const valid =
    row.symbol.trim().length > 0 &&
    Number.isFinite(qty) &&
    qty > 0 &&
    Number.isFinite(price) &&
    price > 0 &&
    iso !== null;
  const id = valid
    ? fillFingerprint({ symbol: row.symbol, side: row.side, qty, price, executedAt: iso! })
    : null;
  return { iso, id, duplicate: id !== null && existingIds.has(id), valid };
}

export function ReviewFills({
  parsed,
  notes,
  dateKey,
  zone,
  existingIds,
  onConfirm,
  onBack,
}: {
  parsed: ParsedFill[];
  notes: string | null;
  dateKey: string;
  zone: string;
  existingIds: Set<string>;
  onConfirm: (fills: Fill[]) => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<RowDraft[]>(() =>
    parsed.map((p) => ({
      included: isFilledStatus(p.status),
      touched: false,
      symbol: p.symbol,
      side: p.side,
      qty: String(p.qty),
      price: String(p.price),
      time: p.time,
      date: p.date,
      status: p.status,
    })),
  );

  const computed = useMemo(
    () => rows.map((r) => computeRow(r, dateKey, zone, existingIds)),
    [rows, dateKey, zone, existingIds],
  );

  const patch = (i: number, p: Partial<RowDraft>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...p } : r)));

  // A row counts only when checked, valid and not already in the journal.
  const accepted: Fill[] = [];
  let duplicateCount = 0;
  const seen = new Set<string>();
  const importedAt = useMemo(() => new Date().toISOString(), []);
  rows.forEach((r, i) => {
    const c = computed[i];
    const effectiveIncluded = r.touched ? r.included : r.included && !c.duplicate;
    if (!effectiveIncluded || !c.valid || c.id === null) return;
    if (c.duplicate || seen.has(c.id)) {
      duplicateCount++;
      return;
    }
    seen.add(c.id);
    accepted.push({
      id: c.id,
      symbol: r.symbol.toUpperCase().trim(),
      side: r.side,
      qty: parseFloat(r.qty),
      price: parseFloat(r.price),
      executedAt: c.iso!,
      importedAt,
    });
  });

  return (
    <div>
      {notes && <NotesStrip>⚠ {notes}</NotesStrip>}

      <Table>
        <thead>
          <tr>
            <Th />
            <Th>Тикер</Th>
            <Th>Сторона</Th>
            <Th>Кол-во</Th>
            <Th>Цена</Th>
            <Th>Время</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = computed[i];
            const checked = r.touched ? r.included : r.included && !c.duplicate;
            return (
              <tr key={i}>
                <Td>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => patch(i, { included: e.target.checked, touched: true })}
                  />
                </Td>
                <Td>
                  <Input
                    $w={64}
                    value={r.symbol}
                    onChange={(e) => patch(i, { symbol: e.target.value.toUpperCase() })}
                  />
                </Td>
                <Td>
                  <Select
                    value={r.side}
                    onChange={(e) => patch(i, { side: e.target.value as Side })}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </Select>
                </Td>
                <Td>
                  <Input $w={70} value={r.qty} onChange={(e) => patch(i, { qty: e.target.value })} />
                </Td>
                <Td>
                  <Input
                    $w={84}
                    value={r.price}
                    onChange={(e) => patch(i, { price: e.target.value })}
                  />
                </Td>
                <Td>
                  <Input
                    $w={84}
                    value={r.time}
                    onChange={(e) => patch(i, { time: e.target.value })}
                  />
                </Td>
                <Td>
                  {!c.valid ? (
                    <Tag $tone="warn">ошибка в данных</Tag>
                  ) : c.duplicate ? (
                    <Tag $tone="warn">дубликат</Tag>
                  ) : !isFilledStatus(r.status) ? (
                    <Tag $tone="muted">пропущено: {r.status}</Tag>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Footer>
        <GhostBtn type="button" onClick={onBack}>
          ← Назад
        </GhostBtn>
        <PrimaryBtn type="button" disabled={accepted.length === 0} onClick={() => onConfirm(accepted)}>
          Добавить {accepted.length} исполн.
        </PrimaryBtn>
        {duplicateCount > 0 && <Hint>пропущено дубликатов: {duplicateCount}</Hint>}
      </Footer>
    </div>
  );
}
