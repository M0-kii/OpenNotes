// Undo/redo stacks.
//
// Each entry holds a list of operations: the inverse for undo, and the
// original operation for redo. Cap at 100 entries; oldest evicted. Stacks
// are immutable (functional style) so React state updates are simple.

import type { Operation } from "./types";

export const HISTORY_CAP = 100;

export interface HistoryEntry {
  // The op(s) that were applied — used when redoing.
  forward: Operation[];
  // The op(s) that revert the change — used when undoing.
  inverse: Operation[];
}

export interface History {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

export const emptyHistory = (): History => ({ undo: [], redo: [] });

export function pushHistory(history: History, entry: HistoryEntry): History {
  const undo = [...history.undo, entry].slice(-HISTORY_CAP);
  // New action invalidates the redo stack.
  return { undo, redo: [] };
}

// Pop most recent entry off the undo stack and move it onto redo.
export function popUndo(
  history: History,
): { entry: HistoryEntry; history: History } | null {
  if (history.undo.length === 0) return null;
  const entry = history.undo[history.undo.length - 1];
  return {
    entry,
    history: {
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, entry].slice(-HISTORY_CAP),
    },
  };
}

export function popRedo(
  history: History,
): { entry: HistoryEntry; history: History } | null {
  if (history.redo.length === 0) return null;
  const entry = history.redo[history.redo.length - 1];
  return {
    entry,
    history: {
      undo: [...history.undo, entry].slice(-HISTORY_CAP),
      redo: history.redo.slice(0, -1),
    },
  };
}
