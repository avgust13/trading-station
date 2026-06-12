"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";

import type { Exchange } from "@/lib/blotter/types";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(0, 0, 0, 0.6);
  overflow-y: auto;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 560px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.accent};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  margin: 0;
  flex: 1;
  color: ${({ theme }) => theme.colors.fg};
  font-size: 18px;
  font-weight: 700;
`;

const CloseBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.zebra};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
  }
`;

const Body = styled.div`
  padding: 16px 18px 20px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const NameInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const CapitalWrap = styled.div`
  position: relative;
  width: 130px;
  flex: none;
`;

const Dollar = styled.span`
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.muted};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
`;

const CapitalInput = styled.input`
  width: 100%;
  padding: 7px 9px 7px 20px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.fg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  text-align: right;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const IconBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.red};
    border-color: ${({ theme }) => `${theme.colors.red}55`};
  }
`;

const AddRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`;

const AddBtn = styled.button`
  appearance: none;
  cursor: pointer;
  flex: none;
  padding: 8px 14px;
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

const Empty = styled.div`
  padding: 8px 0 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

function parseCapital(v: string): number {
  const n = parseFloat(v.replace(/[, ]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ExchangeManager({
  exchanges,
  tradeCountByExchange,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  exchanges: Exchange[];
  tradeCountByExchange: (id: string) => number;
  onAdd: (name: string, capital: number) => void;
  onUpdate: (id: string, patch: { name?: string; capital?: number }) => void;
  onDelete: (ex: Exchange) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newCapital, setNewCapital] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addDisabled = newName.trim().length === 0;
  const submitNew = () => {
    if (addDisabled) return;
    onAdd(newName.trim(), parseCapital(newCapital));
    setNewName("");
    setNewCapital("");
  };

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label="Биржи">
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>Биржи и капитал</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="Закрыть">
            ✕
          </CloseBtn>
        </Head>
        <Body>
          {exchanges.length === 0 && <Empty>Пока нет ни одной биржи. Добавьте первую ниже.</Empty>}

          {exchanges.map((ex) => (
            <Row key={ex.id}>
              <NameInput
                defaultValue={ex.name}
                aria-label="Название биржи"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== ex.name) onUpdate(ex.id, { name: v });
                  else e.target.value = ex.name;
                }}
              />
              <CapitalWrap>
                <Dollar>$</Dollar>
                <CapitalInput
                  defaultValue={String(ex.capital)}
                  aria-label="Капитал"
                  inputMode="decimal"
                  onBlur={(e) => {
                    const v = parseCapital(e.target.value);
                    if (v !== ex.capital) onUpdate(ex.id, { capital: v });
                    e.target.value = String(v);
                  }}
                />
              </CapitalWrap>
              <IconBtn
                type="button"
                aria-label="Удалить биржу"
                title={`Удалить (${tradeCountByExchange(ex.id)} сделок)`}
                onClick={() => onDelete(ex)}
              >
                ✕
              </IconBtn>
            </Row>
          ))}

          <AddRow>
            <NameInput
              placeholder="Название (напр. Binance)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
              }}
            />
            <CapitalWrap>
              <Dollar>$</Dollar>
              <CapitalInput
                placeholder="0"
                inputMode="decimal"
                value={newCapital}
                onChange={(e) => setNewCapital(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNew();
                }}
              />
            </CapitalWrap>
            <AddBtn type="button" disabled={addDisabled} onClick={submitNew}>
              + Добавить
            </AddBtn>
          </AddRow>
        </Body>
      </Dialog>
    </Overlay>
  );
}
