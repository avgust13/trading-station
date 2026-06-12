import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { BlotterState, Fill } from "./types";

// Server-side persistence: one pretty-printed JSON file holding the whole
// BlotterState. All operations are synchronous, so a read-modify-write never
// interleaves with another request in this process. Writes go through a temp
// file + rename, so a killed process can't leave a half-written file behind.

function dataPath(): string {
  return resolve(process.cwd(), process.env.BLOTTER_DATA_PATH || "data/blotter.json");
}

function emptyState(): BlotterState {
  return { version: 1, fills: [], tradeNotes: {} };
}

function readState(): BlotterState {
  const path = dataPath();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return emptyState(); // no file yet
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BlotterState>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.fills)) {
      throw new Error("unexpected shape");
    }
    return {
      version: 1,
      fills: parsed.fills,
      tradeNotes:
        parsed.tradeNotes && typeof parsed.tradeNotes === "object" ? parsed.tradeNotes : {},
    };
  } catch {
    // Don't lose a corrupt file — set it aside and start fresh.
    try {
      renameSync(path, `${path}.corrupt-${Date.now()}`);
    } catch {
      // If even the rename fails, the next write will overwrite it.
    }
    return emptyState();
  }
}

function writeState(state: BlotterState): void {
  const path = dataPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, path); // atomic replace (MOVEFILE_REPLACE_EXISTING on Windows)
}

export function storeGetState(): BlotterState {
  return readState();
}

/** Insert fills, skipping ids already present. Returns how many were added. */
export function storeAddFills(fills: Fill[]): number {
  const state = readState();
  const existing = new Set(state.fills.map((f) => f.id));
  const fresh = fills.filter((f) => !existing.has(f.id));
  if (fresh.length > 0) {
    state.fills.push(...fresh);
    writeState(state);
  }
  return fresh.length;
}

export function storeDeleteFills(ids: string[]): void {
  const drop = new Set(ids);
  const state = readState();
  const next = state.fills.filter((f) => !drop.has(f.id));
  if (next.length !== state.fills.length) {
    state.fills = next;
    writeState(state);
  }
}

export function storeSetNote(tradeId: string, note: string): void {
  const state = readState();
  if (note.trim()) state.tradeNotes[tradeId] = note;
  else delete state.tradeNotes[tradeId];
  writeState(state);
}

export function storeClearAll(): void {
  writeState(emptyState());
}
