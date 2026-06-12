"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { groupFills } from "@/lib/blotter/grouping";
import { computeStats } from "@/lib/blotter/stats";
import { emptyBlotterState, loadBlotter, saveBlotter } from "@/lib/blotter/storage";
import type { BlotterState, Fill, Trade } from "@/lib/blotter/types";
import type { TzMode } from "@/lib/calendar/datetime";
import { ImportPanel, readImageFile, type PastedImage } from "./ImportPanel";
import { StatsBar } from "./StatsBar";
import { TradeDetails } from "./TradeDetails";
import { TradesTable } from "./TradesTable";

/** Display timezone for dates/times and the "today" P&L boundary. */
const DISPLAY_TZ: TzMode = "local";

const Page = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 64px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
`;

const HeaderMain = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 22px;
  font-weight: 700;
`;

const Subtitle = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

const ImportBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => `${theme.colors.accent}22`};
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}33`};
  }
`;

const ClearBtn = styled.button`
  appearance: none;
  cursor: pointer;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.red};
    border-color: ${({ theme }) => `${theme.colors.red}55`};
  }
`;

export function Blotter() {
  // null until mounted — localStorage is browser-only.
  const [state, setState] = useState<BlotterState | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<PastedImage | null>(null);

  useEffect(() => {
    setState(loadBlotter() ?? emptyBlotterState());
  }, []);

  const update = useCallback((fn: (s: BlotterState) => BlotterState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveBlotter(next);
      return next;
    });
  }, []);

  const fills = state?.fills;
  const trades = useMemo(() => (fills ? groupFills(fills) : []), [fills]);
  const stats = useMemo(() => computeStats(trades, DISPLAY_TZ), [trades]);
  const existingIds = useMemo(() => new Set((fills ?? []).map((f) => f.id)), [fills]);
  const selectedTrade: Trade | null =
    trades.find((t) => t.id === selectedTradeId) ?? null;

  // Pasting or dropping a screenshot directly on the blotter page opens the
  // import modal with that image.
  useEffect(() => {
    if (importOpen) return;
    const openWith = (file: File) => {
      readImageFile(file, (img) => {
        setPendingImage(img);
        setImportOpen(true);
      });
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) return;
          e.preventDefault();
          openWith(file);
          return;
        }
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files) return;
      const image = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (!image) return;
      e.preventDefault();
      openWith(image);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [importOpen]);

  const addFills = useCallback(
    (newFills: Fill[]) => {
      update((s) => ({ ...s, fills: [...s.fills, ...newFills] }));
      setImportOpen(false);
      setPendingImage(null);
    },
    [update],
  );

  const deleteTrade = useCallback(
    (trade: Trade) => {
      if (!window.confirm(`Удалить сделку ${trade.symbol} со всеми её исполнениями?`)) return;
      const ids = new Set([...trade.entries, ...trade.exits].map((f) => f.fillId));
      update((s) => {
        const tradeNotes = { ...s.tradeNotes };
        delete tradeNotes[trade.id];
        return { ...s, fills: s.fills.filter((f) => !ids.has(f.id)), tradeNotes };
      });
      setSelectedTradeId((cur) => (cur === trade.id ? null : cur));
    },
    [update],
  );

  const deleteFill = useCallback(
    (fillId: string) => {
      if (!window.confirm("Удалить это исполнение? Сделка будет пересчитана.")) return;
      update((s) => ({ ...s, fills: s.fills.filter((f) => f.id !== fillId) }));
    },
    [update],
  );

  const saveNote = useCallback(
    (tradeId: string, text: string) => {
      update((s) => {
        const tradeNotes = { ...s.tradeNotes };
        if (text.trim()) tradeNotes[tradeId] = text;
        else delete tradeNotes[tradeId];
        return { ...s, tradeNotes };
      });
    },
    [update],
  );

  const clearAll = useCallback(() => {
    if (!window.confirm("Очистить весь журнал сделок? Действие необратимо.")) return;
    update(() => emptyBlotterState());
    setSelectedTradeId(null);
  }, [update]);

  if (!state) return null;

  return (
    <Page>
      <Header>
        <HeaderMain>
          <Title>Журнал сделок</Title>
          <Subtitle>
            Вставьте скриншот или текст ордеров из брокера — AI распознает исполнения и соберёт
            их в сделки.
          </Subtitle>
        </HeaderMain>
        {state.fills.length > 0 && (
          <ClearBtn type="button" onClick={clearAll}>
            Очистить журнал
          </ClearBtn>
        )}
        <ImportBtn type="button" onClick={() => setImportOpen(true)}>
          + Импорт сделок
        </ImportBtn>
      </Header>

      <StatsBar stats={stats} />

      <TradesTable
        trades={trades}
        tz={DISPLAY_TZ}
        onSelect={setSelectedTradeId}
        onDelete={deleteTrade}
      />

      {importOpen && (
        <ImportPanel
          existingIds={existingIds}
          initialImage={pendingImage}
          onAdd={addFills}
          onClose={() => {
            setImportOpen(false);
            setPendingImage(null);
          }}
        />
      )}

      <TradeDetails
        trade={selectedTrade}
        note={selectedTrade ? (state.tradeNotes[selectedTrade.id] ?? "") : ""}
        tz={DISPLAY_TZ}
        onClose={() => setSelectedTradeId(null)}
        onSaveNote={saveNote}
        onDeleteFill={deleteFill}
      />
    </Page>
  );
}
