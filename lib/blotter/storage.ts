import type { BlotterApiError, BlotterState, Fill } from "./types";

// Client-side API for the server-stored journal (data/blotter.json behind
// /api/blotter/*). Replaces the old localStorage persistence.

export function emptyBlotterState(): BlotterState {
  return { version: 1, fills: [], tradeNotes: {} };
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as BlotterApiError;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function expectOk(res: Response, fallback: string): Promise<void> {
  if (!res.ok) throw new Error(await parseError(res, fallback));
}

export async function fetchBlotterState(): Promise<BlotterState> {
  const res = await fetch("/api/blotter/state");
  if (!res.ok) throw new Error(await parseError(res, "Не удалось загрузить журнал."));
  const state = (await res.json()) as BlotterState;
  if (state.version !== 1 || !Array.isArray(state.fills)) {
    throw new Error("Сервер вернул некорректное состояние журнала.");
  }
  return state;
}

export async function apiAddFills(fills: Fill[]): Promise<number> {
  const res = await fetch("/api/blotter/fills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fills }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Не удалось сохранить исполнения."));
  const body = (await res.json()) as { added: number };
  return body.added;
}

export async function apiDeleteFills(ids: string[]): Promise<void> {
  const res = await fetch("/api/blotter/fills", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  await expectOk(res, "Не удалось удалить исполнения.");
}

export async function apiSaveNote(tradeId: string, note: string): Promise<void> {
  const res = await fetch("/api/blotter/notes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tradeId, note }),
  });
  await expectOk(res, "Не удалось сохранить заметку.");
}

export async function apiClearAll(): Promise<void> {
  const res = await fetch("/api/blotter/state", { method: "DELETE" });
  await expectOk(res, "Не удалось очистить журнал.");
}
